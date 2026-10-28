import { Effect } from "effect";
import type { SqlClient } from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";
import { Forbidden, Unauthenticated } from "../errors";
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from "./cookies";
import { validateSession } from "./session";

// Shared contract for "who is signed in". Other modules depend only on these
// three exports: session cookie -> sessions row -> users row.

export interface SessionUser {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string | null;
  readonly role: "ADMIN" | "MEMBER";
}

// Must run inside a request. A stale or unknown cookie is cleared; a session
// that was renewed (sliding expiry) gets a fresh cookie.
export const getOptionalUser: Effect.Effect<SessionUser | null, SqlError, SqlClient> = Effect.gen(function* () {
  const token = yield* readSessionCookie;
  if (!token) return null;
  const session = yield* validateSession(token);
  if (!session) {
    yield* clearSessionCookie;
    return null;
  }
  if (session.renewed) yield* writeSessionCookie(token, session.expiresAt);
  return session.user;
});

export const requireUser: Effect.Effect<SessionUser, Unauthenticated | SqlError, SqlClient> =
  Effect.flatMap(getOptionalUser, (user) =>
    user ? Effect.succeed(user) : Effect.fail(new Unauthenticated()),
  );

export const requireAdmin: Effect.Effect<SessionUser, Unauthenticated | Forbidden | SqlError, SqlClient> =
  Effect.flatMap(requireUser, (user) =>
    user.role === "ADMIN" ? Effect.succeed(user) : Effect.fail(new Forbidden({ reason: "Admins only" })),
  );
