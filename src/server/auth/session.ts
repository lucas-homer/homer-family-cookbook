import { Clock, Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";
import type { SessionUser } from "./current-user";
import { generateToken, hashToken, isTokenShaped } from "./tokens";

// Server-side sessions. The browser holds a random 256-bit token; the
// `sessions.id` column holds only its SHA-256, so the table can't be replayed.

const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_LIFETIME_MS = 30 * DAY_MS;
// Sliding renewal: a session used with less than this left is pushed back out
// to the full lifetime, so regular visitors stay signed in.
export const SESSION_RENEW_WITHIN_MS = 15 * DAY_MS;

export interface NewSession {
  readonly token: string;
  readonly expiresAt: Date;
}

export interface ValidSession {
  readonly user: SessionUser;
  readonly expiresAt: Date;
  // True when this lookup extended the expiry, so the cookie should be re-sent.
  readonly renewed: boolean;
}

export const createSession = (userId: string): Effect.Effect<NewSession, SqlError, SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const now = yield* Clock.currentTimeMillis;
    const token = generateToken();
    const id = yield* hashToken(token);
    const expiresAt = new Date(now + SESSION_LIFETIME_MS);

    // Housekeeping for this user only (indexed): drop their dead sessions.
    yield* sql`DELETE FROM sessions WHERE user_id = ${userId} AND expires_at <= ${new Date(now).toISOString()}`;
    yield* sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt.toISOString()})`;
    return { token, expiresAt };
  });

// Token from the cookie -> signed-in user, or null if unknown or expired.
export const validateSession = (token: string): Effect.Effect<ValidSession | null, SqlError, SqlClient> =>
  Effect.gen(function* () {
    if (!isTokenShaped(token)) return null;
    const sql = yield* SqlClient;
    const now = yield* Clock.currentTimeMillis;
    const id = yield* hashToken(token);

    const rows = yield* sql<SessionUser & { readonly expiresAt: string }>`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, s.expires_at
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ${id} AND s.expires_at > ${new Date(now).toISOString()}`;
    const row = rows[0];
    if (!row) return null;

    const { expiresAt, ...user } = row;
    const current = new Date(expiresAt);
    if (current.getTime() - now >= SESSION_RENEW_WITHIN_MS) {
      return { user, expiresAt: current, renewed: false };
    }
    const renewedAt = new Date(now + SESSION_LIFETIME_MS);
    yield* sql`UPDATE sessions SET expires_at = ${renewedAt.toISOString()} WHERE id = ${id}`;
    return { user, expiresAt: renewedAt, renewed: true };
  });

export const deleteSession = (token: string): Effect.Effect<void, SqlError, SqlClient> =>
  Effect.gen(function* () {
    if (!isTokenShaped(token)) return;
    const sql = yield* SqlClient;
    const id = yield* hashToken(token);
    yield* sql`DELETE FROM sessions WHERE id = ${id}`;
  });
