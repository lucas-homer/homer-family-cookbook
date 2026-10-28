import { deleteCookie, getCookie, getRequestUrl, setCookie } from "@tanstack/react-start/server";
import { Effect } from "effect";
import type { SqlClient } from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";
import { createSession, deleteSession } from "./session";

// The session cookie, read and written through TanStack Start's per-request
// cookie helpers. Only valid inside a request (server fn, loader, route handler).
//
// Over HTTPS the name carries the `__Host-` prefix, which browsers only accept
// with Secure, Path=/ and no Domain, so a sibling subdomain can't plant or
// overwrite it. Plain-HTTP localhost in dev uses an unprefixed, non-Secure cookie.

const SECURE_NAME = "__Host-hfc_session";
const DEV_NAME = "hfc_session";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const cookieContext = () => {
  const url = getRequestUrl({ xForwardedProto: false });
  // Secure everywhere except plain-HTTP localhost.
  const secure = !(url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
  return { name: secure ? SECURE_NAME : DEV_NAME, secure };
};

export const readSessionCookie: Effect.Effect<string | undefined> = Effect.sync(() =>
  getCookie(cookieContext().name),
);

export const writeSessionCookie = (token: string, expiresAt: Date): Effect.Effect<void> =>
  Effect.sync(() => {
    const { name, secure } = cookieContext();
    setCookie(name, token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
      maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    });
  });

export const clearSessionCookie: Effect.Effect<void> = Effect.sync(() => {
  const { name, secure } = cookieContext();
  deleteCookie(name, { httpOnly: true, secure, sameSite: "lax", path: "/" });
});

// Signs `userId` in on this response: replaces any session the browser already
// had with a brand-new one (never reuse an id across a login boundary).
export const startSession = (userId: string): Effect.Effect<void, SqlError, SqlClient> =>
  Effect.gen(function* () {
    yield* endSession;
    const session = yield* createSession(userId);
    yield* writeSessionCookie(session.token, session.expiresAt);
  });

// Deletes the browser's session row (if any) and clears the cookie.
export const endSession: Effect.Effect<void, SqlError, SqlClient> = Effect.gen(function* () {
  const token = yield* readSessionCookie;
  if (token) yield* deleteSession(token);
  yield* clearSessionCookie;
});
