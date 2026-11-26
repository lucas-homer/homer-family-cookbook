import bcrypt from "bcryptjs";
import { Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { describe, expect, it } from "vitest";
import { authenticate } from "~/server/auth/password";
import { isResetTokenOpen, requestPasswordReset, resetPassword, RESET_LIFETIME_MS } from "~/server/auth/password-reset";
import { createSession, validateSession } from "~/server/auth/session";
import { hashToken } from "~/server/auth/tokens";
import type { OutgoingEmail, SendEmail } from "~/server/email";
import { EmailNotSent } from "~/server/email";
import { runtime } from "~/server/runtime";

type Services = Parameters<typeof runtime.runPromise>[0] extends Effect.Effect<any, any, infer R> ? R : never;
const run = <A, E>(effect: Effect.Effect<A, E, Services>) => runtime.runPromise(effect);
const sql = <A extends object>(build: (sql: SqlClient) => Effect.Effect<ReadonlyArray<A>, unknown>) =>
  run(Effect.flatMap(SqlClient, build));

await sql((s) => s`INSERT INTO users (id, email, first_name, password_hash) VALUES ('pr-1', 'reset@example.test', 'Rae', ${bcrypt.hashSync("old password 1", 4)})`);

const fieldErrorsOf = async <A, E extends { _tag: string }>(effect: Effect.Effect<A, E, Services>) => {
  const error = await run(Effect.flip(effect));
  if (!("fieldErrors" in error)) throw new Error(`Expected InvalidInput, got ${error._tag}`);
  return error.fieldErrors as Record<string, string>;
};

const inbox: OutgoingEmail[] = [];
const send: SendEmail = (m) => Effect.sync(() => void inbox.push(m));
const SITE = "https://homerfamilycookbook.com";

const requestLink = async (email = "reset@example.test") => {
  inbox.length = 0;
  await run(requestPasswordReset({ email }, { siteUrl: SITE, send }));
  const m = inbox[0];
  return m ? /\/reset-password\/([A-Za-z0-9_-]{43})/.exec(m.text)![1]! : null;
};

describe("password reset", () => {
  it("emails a one-hour link only when the email has an account", async () => {
    const token = await requestLink("RESET@example.test ");
    expect(token).toBeTruthy();
    expect(inbox[0]).toMatchObject({ subject: "Reset your Homer Family Cookbook password" });
    expect(inbox[0]!.html).toContain(`${SITE}/reset-password/${token}`);
    const hash = await Effect.runPromise(hashToken(token!));
    const [row] = await sql<{ expiresAt: string }>((s) => s`SELECT expires_at FROM password_resets WHERE token_hash = ${hash}`);
    const lifetime = Date.parse(row!.expiresAt) - Date.now();
    expect(lifetime).toBeGreaterThan(RESET_LIFETIME_MS - 60_000);
    expect(lifetime).toBeLessThanOrEqual(RESET_LIFETIME_MS);

    expect(await requestLink("nobody@example.test")).toBeNull();
  });

  it("succeeds the same way when sending fails", async () => {
    const failing: SendEmail = () => Effect.fail(new EmailNotSent({ cause: "down" }));
    await expect(run(requestPasswordReset({ email: "reset@example.test" }, { siteUrl: SITE, send: failing }))).resolves.toBeUndefined();
  });

  it("sets the new password, uses up every open link, and signs out everywhere", async () => {
    const first = (await requestLink())!;
    const second = (await requestLink())!;
    const session = await run(createSession("pr-1"));

    const short = await fieldErrorsOf(resetPassword({ token: first, password: "short" }));
    expect(short).toHaveProperty("password");

    expect(await run(resetPassword({ token: first, password: "brand new password" }))).toBe("pr-1");
    expect(await run(authenticate({ email: "reset@example.test", password: "brand new password" }))).toMatchObject({ id: "pr-1" });
    expect(await run(validateSession(session.token))).toBeNull();

    for (const used of [first, second]) {
      expect(await run(isResetTokenOpen(used))).toBe(false);
      const again = await fieldErrorsOf(resetPassword({ token: used, password: "another password" }));
      expect(again.form).toMatch(/not valid or has expired/);
    }
  });

  it("refuses an expired or unknown link", async () => {
    const token = (await requestLink())!;
    const hash = await Effect.runPromise(hashToken(token));
    await sql((s) => s`UPDATE password_resets SET expires_at = '2000-01-01T00:00:00.000Z' WHERE token_hash = ${hash}`);
    expect(await run(isResetTokenOpen(token))).toBe(false);
    expect((await fieldErrorsOf(resetPassword({ token, password: "fine password" }))).form).toBeTruthy();
    expect((await fieldErrorsOf(resetPassword({ token: "x".repeat(43), password: "fine password" }))).form).toBeTruthy();
  });
});
