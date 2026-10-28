import { D1Client } from "@effect/sql-d1/D1Client";
import { Clock, Data, Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { SqlError } from "effect/sql/SqlError";
import type { SessionUser } from "./current-user";
import { hashPassword, normalizeEmail } from "./password";
import { generateToken, hashToken, isTokenShaped } from "./tokens";

// Invite-only signup. An admin creates an invite and shares the one-time link
// /join/<token>; only the token's SHA-256 is stored in `invites.token_hash`.
// Revoking an unused invite sets its expiry to now, so it reads as expired.

const DAY_MS = 24 * 60 * 60 * 1000;
export const INVITE_DEFAULT_DAYS = 14;
export const INVITE_MAX_DAYS = 90;

export type Role = "ADMIN" | "MEMBER";
export type InviteStatus = "pending" | "used" | "expired";

// Why a token can't be redeemed. "invalid" covers unknown and malformed tokens.
export class InviteUnavailable extends Data.TaggedError("InviteUnavailable")<{
  readonly reason: "invalid" | "used" | "expired" | "email-mismatch";
}> {}

export class EmailTaken extends Data.TaggedError("EmailTaken")<{}> {}

export interface CreatedInvite {
  readonly id: string;
  readonly token: string;
  readonly expiresAt: string;
}

export interface InviteSummary {
  readonly id: string;
  readonly email: string | null;
  readonly role: Role;
  readonly status: InviteStatus;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
  readonly createdByName: string | null;
  readonly usedByName: string | null;
}

export interface OpenInvite {
  readonly email: string | null;
  readonly role: Role;
  readonly expiresAt: string;
}

interface InviteRow {
  readonly id: string;
  readonly email: string | null;
  readonly role: Role;
  readonly expiresAt: string;
  readonly usedAt: string | null;
}

const nowIso = Effect.map(Clock.currentTimeMillis, (ms) => new Date(ms).toISOString());

const statusOf = (invite: { readonly usedAt: string | null; readonly expiresAt: string }, now: string): InviteStatus =>
  invite.usedAt !== null ? "used" : invite.expiresAt <= now ? "expired" : "pending";

export const createInvite = (input: {
  readonly email: string | null;
  readonly role: Role;
  readonly expiresInDays: number;
  readonly createdBy: string;
}): Effect.Effect<CreatedInvite, SqlError, SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const now = yield* Clock.currentTimeMillis;
    const id = crypto.randomUUID();
    const token = generateToken();
    const tokenHash = yield* hashToken(token);
    const expiresAt = new Date(now + input.expiresInDays * DAY_MS).toISOString();
    const email = input.email === null ? null : normalizeEmail(input.email);

    yield* sql`
      INSERT INTO invites (id, token_hash, email, role, created_by, expires_at)
      VALUES (${id}, ${tokenHash}, ${email}, ${input.role}, ${input.createdBy}, ${expiresAt})`;
    return { id, token, expiresAt };
  });

export const listInvites: Effect.Effect<ReadonlyArray<InviteSummary>, SqlError, SqlClient> = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const now = yield* nowIso;
  const rows = yield* sql<Omit<InviteSummary, "status">>`
    SELECT i.id, i.email, i.role, i.created_at, i.expires_at, i.used_at,
           trim(c.first_name || ' ' || coalesce(c.last_name, '')) AS created_by_name,
           trim(u.first_name || ' ' || coalesce(u.last_name, '')) AS used_by_name
    FROM invites i
    LEFT JOIN users c ON c.id = i.created_by
    LEFT JOIN users u ON u.id = i.used_by
    ORDER BY i.created_at DESC`;
  return rows.map((row) => ({ ...row, status: statusOf(row, now) }));
});

const REVOKED_AT = "1970-01-01T00:00:00.000Z";

// Returns false when there was nothing to revoke (unknown, used or already expired).
export const revokeInvite = (id: string): Effect.Effect<boolean, SqlError, SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const now = yield* nowIso;
    // Expire to a fixed past instant, not "now": a redemption that started just
    // before the revoke must still see the invite as expired.
    const rows = yield* sql<{ readonly id: string }>`
      UPDATE invites SET expires_at = ${REVOKED_AT}
      WHERE id = ${id} AND used_at IS NULL AND expires_at > ${now}
      RETURNING id`;
    return rows.length > 0;
  });

const findByToken = (token: string) =>
  Effect.gen(function* () {
    if (!isTokenShaped(token)) return undefined;
    const sql = yield* SqlClient;
    const tokenHash = yield* hashToken(token);
    const rows = yield* sql<InviteRow>`
      SELECT id, email, role, expires_at, used_at FROM invites WHERE token_hash = ${tokenHash}`;
    return rows[0];
  });

// For the /join page: is this token usable right now?
export const getOpenInvite = (token: string): Effect.Effect<OpenInvite, InviteUnavailable | SqlError, SqlClient> =>
  Effect.gen(function* () {
    const invite = yield* findByToken(token);
    if (!invite) return yield* new InviteUnavailable({ reason: "invalid" });
    const status = statusOf(invite, yield* nowIso);
    if (status !== "pending") return yield* new InviteUnavailable({ reason: status });
    return { email: invite.email, role: invite.role, expiresAt: invite.expiresAt };
  });

export interface RedeemInput {
  readonly token: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string | null;
  // Already checked against the password rules by the caller.
  readonly password: string;
}

// Creates the user and consumes the invite in a single D1 batch (atomic: all
// statements commit or none do). The INSERT only selects a row while the invite
// is unused, unexpired and matches any email lock; the UPDATE then marks it
// used by exactly that new user. D1 runs batches one at a time, so of two
// concurrent redemptions only the first sees an open invite; the second inserts
// nothing and updates nothing. A duplicate email aborts the whole batch, which
// leaves the invite unused.
export const redeemInvite = (
  input: RedeemInput,
): Effect.Effect<SessionUser, InviteUnavailable | EmailTaken | SqlError, D1Client> =>
  Effect.gen(function* () {
    const db = yield* D1Client;
    const email = normalizeEmail(input.email);

    // Friendly, specific errors first. The batch below is what actually enforces them.
    const invite = yield* getOpenInvite(input.token).pipe(Effect.provideService(SqlClient, db));
    if (invite.email !== null && normalizeEmail(invite.email) !== email) {
      return yield* new InviteUnavailable({ reason: "email-mismatch" });
    }
    const existing = yield* db<{ readonly id: string }>`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) return yield* new EmailTaken();

    const passwordHash = yield* hashPassword(input.password);
    const tokenHash = yield* hashToken(input.token);
    const userId = crypto.randomUUID();
    const now = yield* nowIso;

    const [, claimed] = yield* db
      .batch([
        db`
          INSERT INTO users (id, email, role, first_name, last_name, password_hash, created_at, updated_at)
          SELECT ${userId}, ${email}, role, ${input.firstName}, ${input.lastName}, ${passwordHash}, ${now}, ${now}
          FROM invites
          WHERE token_hash = ${tokenHash} AND used_at IS NULL
            AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            AND (email IS NULL OR email = ${email})`,
        db<{ readonly id: string }>`
          UPDATE invites SET used_at = ${now}, used_by = ${userId}
          WHERE token_hash = ${tokenHash} AND used_at IS NULL
            AND EXISTS (SELECT 1 FROM users WHERE id = ${userId})
          RETURNING id`,
      ])
      .pipe(
        Effect.catchIf(isUniqueEmailViolation, () => Effect.fail(new EmailTaken())),
      );

    // Lost a race with another redemption (or the invite expired meanwhile).
    if (claimed.length === 0) return yield* new InviteUnavailable({ reason: "used" });

    const users = yield* db<SessionUser>`
      SELECT id, email, first_name, last_name, role FROM users WHERE id = ${userId}`;
    const user = users[0];
    if (!user) return yield* Effect.die(new Error("Invite redeemed but the new user is missing"));
    return user;
  });

const isUniqueEmailViolation = (error: SqlError | EmailTaken): boolean => {
  if (!(error instanceof SqlError)) return false;
  const reason = error.reason as { readonly cause?: unknown; readonly message?: unknown };
  const text = `${String(reason.cause)} ${String(reason.message)}`;
  return text.includes("UNIQUE constraint failed: users.email");
};
