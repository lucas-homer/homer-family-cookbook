import bcrypt from "bcryptjs";
import { Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInviteFor, join } from "~/server/auth/flows";
import {
  createInvite,
  getOpenInvite,
  listInvites,
  redeemInvite,
  revokeInvite,
  type RedeemInput,
} from "~/server/auth/invites";
import { authenticate } from "~/server/auth/password";
import { hashToken } from "~/server/auth/tokens";
import { runtime } from "~/server/runtime";

type Services = Parameters<typeof runtime.runPromise>[0] extends Effect.Effect<any, any, infer R> ? R : never;

const run = <A, E>(effect: Effect.Effect<A, E, Services>) => runtime.runPromise(effect);
const failureOf = <A, E>(effect: Effect.Effect<A, E, Services>) => run(Effect.flip(effect));
const query = <A extends object = Record<string, unknown>>(
  build: (sql: SqlClient) => Effect.Effect<ReadonlyArray<A>, unknown>,
) =>
  run(
    Effect.gen(function* () {
      return yield* build(yield* SqlClient);
    }),
  );

const ADMIN = { id: "admin-1", email: "admin@example.com", firstName: "Ada", lastName: null, role: "ADMIN" } as const;
await query((sql) => sql`INSERT INTO users ${sql.insert({ id: ADMIN.id, email: ADMIN.email, firstName: "Ada", role: "ADMIN" })}`);

let seq = 0;
const newInvite = (opts: { email?: string | null; role?: "ADMIN" | "MEMBER"; days?: number } = {}) =>
  run(createInvite({ email: opts.email ?? null, role: opts.role ?? "MEMBER", expiresInDays: opts.days ?? 14, createdBy: ADMIN.id }));

const redeemer = (token: string, overrides: Partial<RedeemInput> = {}): RedeemInput => ({
  token,
  email: `joiner${++seq}@example.com`,
  firstName: "June",
  lastName: "Homer",
  password: "a fine password",
  ...overrides,
});

const usersWithEmail = (email: string) =>
  query<{ id: string }>((sql) => sql`SELECT id FROM users WHERE email = ${email}`);

afterEach(() => vi.restoreAllMocks());

describe("creating invites", () => {
  it("stores only the SHA-256 of a 256-bit token", async () => {
    const invite = await newInvite({ email: "Lock@Example.com", role: "ADMIN" });
    expect(invite.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const rows = await query<{ tokenHash: string; email: string; role: string; createdBy: string }>(
      (sql) => sql`SELECT token_hash, email, role, created_by FROM invites WHERE id = ${invite.id}`,
    );
    expect(rows[0]).toEqual({
      tokenHash: await run(hashToken(invite.token)),
      email: "lock@example.com",
      role: "ADMIN",
      createdBy: ADMIN.id,
    });
    const leaked = await query((sql) => sql`SELECT id FROM invites WHERE token_hash = ${invite.token}`);
    expect(leaked).toHaveLength(0);
  });

  it("defaults to 14 days and validates admin input", async () => {
    const created = await run(createInviteFor(ADMIN, { email: "", role: "MEMBER", expiresInDays: 14 }));
    const days = (new Date(created.expiresAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThanOrEqual(14);

    const bad = await failureOf(createInviteFor(ADMIN, { email: "nope", role: "OWNER", expiresInDays: 0 }));
    expect(bad._tag === "InvalidInput" && Object.keys(bad.fieldErrors).sort()).toEqual(["email", "expiresInDays", "role"]);
    const tooLong = await failureOf(createInviteFor(ADMIN, { email: "", role: "MEMBER", expiresInDays: 1.5 }));
    expect(tooLong._tag).toBe("InvalidInput");
  });
});

describe("redeeming invites", () => {
  it("creates the user with the invite's role, marks it used and lets them log in", async () => {
    const invite = await newInvite({ role: "ADMIN" });
    expect(await run(getOpenInvite(invite.token))).toMatchObject({ email: null, role: "ADMIN" });

    const input = redeemer(invite.token, { email: "  New.Person@Example.com " });
    const user = await run(redeemInvite(input));
    expect(user).toMatchObject({ email: "new.person@example.com", firstName: "June", lastName: "Homer", role: "ADMIN" });

    const rows = await query<{ usedAt: string | null; usedBy: string | null }>(
      (sql) => sql`SELECT used_at, used_by FROM invites WHERE id = ${invite.id}`,
    );
    expect(rows[0]!.usedBy).toBe(user.id);
    expect(rows[0]!.usedAt).not.toBeNull();

    const hash = await query<{ passwordHash: string }>((sql) => sql`SELECT password_hash FROM users WHERE id = ${user.id}`);
    expect(bcrypt.getRounds(hash[0]!.passwordHash)).toBe(10);
    expect((await run(authenticate({ email: "new.person@example.com", password: "a fine password" }))).id).toBe(user.id);
  });

  it("can't be used twice", async () => {
    const invite = await newInvite();
    await run(redeemInvite(redeemer(invite.token)));
    const second = await failureOf(redeemInvite(redeemer(invite.token)));
    expect(second).toMatchObject({ _tag: "InviteUnavailable", reason: "used" });
    expect(await failureOf(getOpenInvite(invite.token))).toMatchObject({ reason: "used" });
  });

  it("two concurrent redemptions create exactly one user", async () => {
    const invite = await newInvite();
    const a = redeemer(invite.token);
    const b = redeemer(invite.token);
    const results = await Promise.allSettled([run(redeemInvite(a)), run(redeemInvite(b))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const created = [...(await usersWithEmail(a.email)), ...(await usersWithEmail(b.email))];
    expect(created).toHaveLength(1);
  });

  it("the batch refuses an invite consumed after the up-front checks passed", async () => {
    const invite = await newInvite();
    const winner = redeemer(invite.token);
    const loser = redeemer(invite.token);
    // Hashing happens between the friendly checks and the batch. Use that gap
    // to let a second redemption win the race deterministically.
    const realHash = bcrypt.hash.bind(bcrypt) as (password: string, salt: number) => Promise<string>;
    const spy = vi.spyOn(bcrypt, "hash");
    spy.mockImplementationOnce(async (password: string, salt: number | string) => {
      await run(redeemInvite(winner));
      return realHash(password, salt as number);
    });

    const error = await failureOf(redeemInvite(loser));
    expect(error).toMatchObject({ _tag: "InviteUnavailable", reason: "used" });
    expect(await usersWithEmail(winner.email)).toHaveLength(1);
    expect(await usersWithEmail(loser.email)).toHaveLength(0);
    const rows = await query<{ usedBy: string }>((sql) => sql`SELECT used_by FROM invites WHERE id = ${invite.id}`);
    expect(rows[0]!.usedBy).toBe((await usersWithEmail(winner.email))[0]!.id);
  });

  it("rejects expired invites", async () => {
    const invite = await newInvite();
    await query((sql) => sql`UPDATE invites SET expires_at = ${new Date(Date.now() - 1000).toISOString()} WHERE id = ${invite.id}`);
    expect(await failureOf(getOpenInvite(invite.token))).toMatchObject({ reason: "expired" });
    const input = redeemer(invite.token);
    expect(await failureOf(redeemInvite(input))).toMatchObject({ _tag: "InviteUnavailable", reason: "expired" });
    expect(await usersWithEmail(input.email)).toHaveLength(0);
  });

  it("rejects revoked invites, and revoking only touches open invites", async () => {
    const invite = await newInvite();
    expect(await run(revokeInvite(invite.id))).toBe(true);
    expect(await run(revokeInvite(invite.id))).toBe(false);
    const input = redeemer(invite.token);
    expect(await failureOf(redeemInvite(input))).toMatchObject({ reason: "expired" });
    expect(await usersWithEmail(input.email)).toHaveLength(0);

    const used = await newInvite();
    await run(redeemInvite(redeemer(used.token)));
    expect(await run(revokeInvite(used.id))).toBe(false);
  });

  it("enforces revocation and expiry with database time, even if the app's clock lags", async () => {
    const invite = await newInvite();
    expect(await run(revokeInvite(invite.id))).toBe(true);
    // Pretend the redemption's friendly pre-check ran before the revoke landed:
    // with the app clock set before the revoke instant, only the batch's own
    // database-time check stands between the token and a new account.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("1960-01-01T00:00:00.000Z"));
    try {
      const input = redeemer(invite.token);
      expect(await failureOf(redeemInvite(input))).toMatchObject({ _tag: "InviteUnavailable" });
      expect(await usersWithEmail(input.email)).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects an email that doesn't match a locked invite, and accepts it in any case", async () => {
    const invite = await newInvite({ email: "cousin@example.com" });
    const wrong = redeemer(invite.token, { email: "someone-else@example.com" });
    expect(await failureOf(redeemInvite(wrong))).toMatchObject({ _tag: "InviteUnavailable", reason: "email-mismatch" });
    expect(await usersWithEmail(wrong.email)).toHaveLength(0);

    const user = await run(redeemInvite(redeemer(invite.token, { email: "Cousin@Example.COM" })));
    expect(user.email).toBe("cousin@example.com");
  });

  it("rejects unknown and malformed tokens", async () => {
    expect(await failureOf(getOpenInvite("A".repeat(43)))).toMatchObject({ reason: "invalid" });
    expect(await failureOf(getOpenInvite("../../etc"))).toMatchObject({ reason: "invalid" });
    const invite = await newInvite();
    const hashAsToken = await run(hashToken(invite.token));
    expect(await failureOf(getOpenInvite(hashAsToken))).toMatchObject({ reason: "invalid" });
  });

  it("refuses an email that already has an account and leaves the invite usable", async () => {
    const invite = await newInvite();
    const taken = await failureOf(redeemInvite(redeemer(invite.token, { email: ADMIN.email.toUpperCase() })));
    expect(taken._tag).toBe("EmailTaken");
    expect(await run(getOpenInvite(invite.token))).toBeTruthy();
  });

  it("maps a duplicate email that appears mid-redemption to EmailTaken, keeping the invite open", async () => {
    const invite = await newInvite();
    const input = redeemer(invite.token);
    const realHash = bcrypt.hash.bind(bcrypt) as (password: string, salt: number) => Promise<string>;
    vi.spyOn(bcrypt, "hash").mockImplementationOnce(async (password: string, salt: number | string) => {
      await query((sql) => sql`INSERT INTO users ${sql.insert({ id: `race-${seq}`, email: input.email, firstName: "Race" })}`);
      return realHash(password, salt as number);
    });
    expect((await failureOf(redeemInvite(input)))._tag).toBe("EmailTaken");
    expect(await run(getOpenInvite(invite.token))).toBeTruthy();
  });

  it("join flow validates fields and password rules before touching the invite", async () => {
    const invite = await newInvite();
    const bad = await failureOf(join({ token: invite.token, email: "x", firstName: "  ", lastName: "", password: "short" }));
    expect(bad._tag === "InvalidInput" && Object.keys(bad.fieldErrors).sort()).toEqual(["email", "firstName"]);
    const weak = await failureOf(join({ token: invite.token, email: "ok@example.com", firstName: "Ok", lastName: "", password: "short" }));
    expect(weak._tag === "InvalidInput" && weak.fieldErrors).toEqual({ password: expect.stringMatching(/at least 8/) });
    expect(await run(getOpenInvite(invite.token))).toBeTruthy();

    const user = await run(join({ token: invite.token, email: "ok@example.com", firstName: " Ok ", lastName: "", password: "long enough" }));
    expect(user).toMatchObject({ firstName: "Ok", lastName: null, role: "MEMBER" });
    const again = await failureOf(join({ token: invite.token, email: "ok2@example.com", firstName: "Ok", lastName: "", password: "long enough" }));
    expect(again._tag === "InvalidInput" && again.fieldErrors).toEqual({ form: "This invite has already been used." });
  });
});

describe("listing invites", () => {
  it("reports pending, used and expired status with names", async () => {
    const pending = await newInvite({ email: "pending@example.com" });
    const used = await newInvite();
    const user = await run(redeemInvite(redeemer(used.token, { firstName: "Uma", lastName: null })));
    const revoked = await newInvite();
    await run(revokeInvite(revoked.id));

    const list = await run(listInvites);
    const byId = new Map(list.map((invite) => [invite.id, invite]));
    expect(byId.get(pending.id)).toMatchObject({ status: "pending", email: "pending@example.com", createdByName: "Ada" });
    expect(byId.get(used.id)).toMatchObject({ status: "used", usedByName: "Uma" });
    expect(byId.get(revoked.id)).toMatchObject({ status: "expired", usedAt: null });
    expect(user.id).toBeTruthy();
    expect(JSON.stringify(list)).not.toMatch(/tokenHash|token_hash/);
  });
});
