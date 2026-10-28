import bcrypt from "bcryptjs";
import { Effect, Exit } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake request context for TanStack Start's cookie helpers.
const request = vi.hoisted(() => ({
  url: "https://cookbook.example/",
  headers: new Headers(),
  cookies: new Map<string, string>(),
  setCookieCalls: [] as Array<{ name: string; value: string; options: Record<string, unknown> }>,
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequestUrl: () => new URL(request.url),
  getRequest: () => new Request(request.url, { method: "POST", headers: request.headers }),
  getCookie: (name: string) => request.cookies.get(name),
  setCookie: (name: string, value: string, options: Record<string, unknown> = {}) => {
    request.setCookieCalls.push({ name, value, options });
    if (options.maxAge === 0) request.cookies.delete(name);
    else request.cookies.set(name, value);
  },
  deleteCookie: (name: string, options: Record<string, unknown> = {}) => {
    request.setCookieCalls.push({ name, value: "", options: { ...options, maxAge: 0 } });
    request.cookies.delete(name);
  },
}));

import { endSession, startSession } from "~/server/auth/cookies";
import { isSameOriginRequest } from "~/server/auth/csrf";
import { getOptionalUser, requireAdmin, requireUser } from "~/server/auth/current-user";
import { INVALID_LOGIN, login } from "~/server/auth/flows";
import { authenticate, checkNewPassword } from "~/server/auth/password";
import { safeRedirectTo } from "~/server/auth/redirect";
import { createSession, deleteSession, SESSION_LIFETIME_MS, validateSession } from "~/server/auth/session";
import { hashToken } from "~/server/auth/tokens";
import { runtime } from "~/server/runtime";

const run = <A, E>(effect: Effect.Effect<A, E, SqlClient>) => runtime.runPromise(effect);
const runExit = <A, E>(effect: Effect.Effect<A, E, SqlClient>) => runtime.runPromiseExit(effect);
const failureOf = async <A, E>(effect: Effect.Effect<A, E, SqlClient>) => run(Effect.flip(effect));

const sqlRun = <A extends object = Record<string, unknown>>(
  build: (sql: SqlClient) => Effect.Effect<ReadonlyArray<A>, unknown>,
) =>
  run(
    Effect.gen(function* () {
      return yield* build(yield* SqlClient);
    }),
  );

const PASSWORD = "correct horse battery";
let seq = 0;

const createUser = async (opts: { role?: "ADMIN" | "MEMBER"; password?: string | null } = {}) => {
  const id = `user-${++seq}`;
  const email = `Person${seq}@Example.com`;
  const passwordHash = opts.password === null ? null : await bcrypt.hash(opts.password ?? PASSWORD, 10);
  await sqlRun((sql) =>
    sql`INSERT INTO users ${sql.insert({ id, email, firstName: "Pat", lastName: "Homer", role: opts.role ?? "MEMBER", passwordHash })}`,
  );
  return { id, email };
};

beforeEach(() => {
  request.url = "https://cookbook.example/";
  request.headers = new Headers();
  request.cookies.clear();
  request.setCookieCalls.length = 0;
});

afterEach(() => vi.restoreAllMocks());

describe("password login", () => {
  it("accepts the right password for a bcrypt hash and returns the user without the hash", async () => {
    const { id, email } = await createUser();
    const user = await run(authenticate({ email, password: PASSWORD }));
    expect(user).toEqual({ id, email, firstName: "Pat", lastName: "Homer", role: "MEMBER" });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("matches the email case-insensitively and ignores surrounding spaces", async () => {
    const { id, email } = await createUser();
    const user = await run(authenticate({ email: `  ${email.toUpperCase()} `, password: PASSWORD }));
    expect(user.id).toBe(id);
  });

  it("rejects a wrong password", async () => {
    const { email } = await createUser();
    const error = await failureOf(authenticate({ email, password: "wrong password" }));
    expect(error._tag).toBe("InvalidCredentials");
  });

  it("gives the same error for an unknown email, and still runs a bcrypt comparison", async () => {
    const { email } = await createUser();
    const compare = vi.spyOn(bcrypt, "compare");
    const unknown = await failureOf(authenticate({ email: "nobody@example.com", password: PASSWORD }));
    expect(compare).toHaveBeenCalledTimes(1);
    const wrong = await failureOf(authenticate({ email, password: "nope nope" }));
    expect(compare).toHaveBeenCalledTimes(2);
    expect(unknown).toEqual(wrong);
  });

  it("rejects users without a password hash the same way", async () => {
    const { email } = await createUser({ password: null });
    const error = await failureOf(authenticate({ email, password: PASSWORD }));
    expect(error._tag).toBe("InvalidCredentials");
  });

  it("login flow reports one identical message for wrong password and unknown email", async () => {
    const { email } = await createUser();
    const wrong = await failureOf(login({ email, password: "bad password" }));
    const unknown = await failureOf(login({ email: "ghost@example.com", password: "bad password" }));
    expect(wrong).toEqual(unknown);
    expect(wrong._tag === "InvalidInput" && wrong.fieldErrors).toEqual({ form: INVALID_LOGIN });
  });

  it("login flow validates input and sanitises redirectTo", async () => {
    const { email } = await createUser();
    const ok = await run(login({ email, password: PASSWORD, redirectTo: "//evil.example" }));
    expect(ok.redirectTo).toBe("/");
    const kept = await run(login({ email, password: PASSWORD, redirectTo: "/recipes/abc?x=1" }));
    expect(kept.redirectTo).toBe("/recipes/abc?x=1");
    const bad = await failureOf(login({ email: "not-an-email", password: "" }));
    expect(bad._tag === "InvalidInput" && Object.keys(bad.fieldErrors).sort()).toEqual(["email", "password"]);
  });

  it("enforces new-password rules", () => {
    expect(checkNewPassword("short")).toMatch(/at least 8/);
    expect(checkNewPassword("        ")).toMatch(/spaces/);
    expect(checkNewPassword("x".repeat(73))).toMatch(/too long/);
    expect(checkNewPassword("é".repeat(37))).toMatch(/too long/); // 74 bytes
    expect(checkNewPassword("a decent passphrase")).toBeUndefined();
  });
});

describe("sessions", () => {
  it("stores only the SHA-256 of the token", async () => {
    const { id: userId } = await createUser();
    const { token } = await run(createSession(userId));
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const rows = await sqlRun<{ id: string }>((sql) => sql`SELECT id FROM sessions WHERE user_id = ${userId}`);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).not.toBe(token);
    expect(rows[0]!.id).toBe(await run(hashToken(token)));
    expect(rows[0]!.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("looks a session up by its token, with a 30-day expiry", async () => {
    const { id: userId, email } = await createUser({ role: "ADMIN" });
    const before = Date.now();
    const created = await run(createSession(userId));
    expect(created.expiresAt.getTime()).toBeGreaterThanOrEqual(before + SESSION_LIFETIME_MS - 1000);
    const session = await run(validateSession(created.token));
    expect(session?.user).toEqual({ id: userId, email, firstName: "Pat", lastName: "Homer", role: "ADMIN" });
    expect(session?.renewed).toBe(false);
  });

  it("rejects unknown, malformed and hash-as-token values", async () => {
    const { id: userId } = await createUser();
    const { token } = await run(createSession(userId));
    const storedHash = await run(hashToken(token));
    expect(await run(validateSession("A".repeat(43)))).toBeNull();
    expect(await run(validateSession("short"))).toBeNull();
    expect(await run(validateSession(`${token}x`))).toBeNull();
    expect(await run(validateSession(storedHash))).toBeNull();
  });

  it("rejects expired sessions", async () => {
    const { id: userId } = await createUser();
    const { token } = await run(createSession(userId));
    const id = await run(hashToken(token));
    await sqlRun((sql) => sql`UPDATE sessions SET expires_at = ${new Date(Date.now() - 1000).toISOString()} WHERE id = ${id}`);
    expect(await run(validateSession(token))).toBeNull();
  });

  it("slides the expiry forward when less than half the lifetime is left", async () => {
    const { id: userId } = await createUser();
    const { token } = await run(createSession(userId));
    const id = await run(hashToken(token));
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    await sqlRun((sql) => sql`UPDATE sessions SET expires_at = ${soon} WHERE id = ${id}`);
    const session = await run(validateSession(token));
    expect(session?.renewed).toBe(true);
    expect(session!.expiresAt.getTime()).toBeGreaterThan(Date.now() + SESSION_LIFETIME_MS - 60_000);
    const rows = await sqlRun<{ expiresAt: string }>((sql) => sql`SELECT expires_at FROM sessions WHERE id = ${id}`);
    expect(rows[0]!.expiresAt).toBe(session!.expiresAt.toISOString());
  });

  it("deleteSession removes the row", async () => {
    const { id: userId } = await createUser();
    const { token } = await run(createSession(userId));
    await run(deleteSession(token));
    const rows = await sqlRun((sql) => sql`SELECT id FROM sessions WHERE user_id = ${userId}`);
    expect(rows).toHaveLength(0);
    expect(await run(validateSession(token))).toBeNull();
  });
});

describe("session cookie and current user", () => {
  const cookieName = "__Host-hfc_session";

  it("startSession sets an HttpOnly, Secure, SameSite=Lax, Path=/ cookie on HTTPS", async () => {
    const { id: userId } = await createUser();
    await run(startSession(userId));
    const set = request.setCookieCalls.at(-1)!;
    expect(set.name).toBe(cookieName);
    expect(set.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(set.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect(set.options).not.toHaveProperty("domain");
    expect(set.options.maxAge).toBeGreaterThan(29 * 24 * 60 * 60);
  });

  it("uses a non-Secure, unprefixed cookie only on plain-HTTP localhost", async () => {
    const { id: userId } = await createUser();
    request.url = "http://localhost:5181/login";
    await run(startSession(userId));
    expect(request.setCookieCalls.at(-1)).toMatchObject({ name: "hfc_session", options: { secure: false, httpOnly: true } });

    request.url = "http://cookbook.example/login";
    await run(startSession(userId));
    expect(request.setCookieCalls.at(-1)).toMatchObject({ name: cookieName, options: { secure: true } });
  });

  it("getOptionalUser returns null without a cookie and the user with a valid one", async () => {
    expect(await run(getOptionalUser)).toBeNull();
    const { id: userId } = await createUser();
    await run(startSession(userId));
    expect((await run(getOptionalUser))?.id).toBe(userId);
  });

  it("logging in again replaces the previous session", async () => {
    const { id: userId } = await createUser();
    await run(startSession(userId));
    const first = request.cookies.get(cookieName)!;
    await run(startSession(userId));
    expect(request.cookies.get(cookieName)).not.toBe(first);
    expect(await run(validateSession(first))).toBeNull();
    const rows = await sqlRun((sql) => sql`SELECT id FROM sessions WHERE user_id = ${userId}`);
    expect(rows).toHaveLength(1);
  });

  it("clears the cookie when the session is unknown or expired", async () => {
    request.cookies.set(cookieName, "B".repeat(43));
    expect(await run(getOptionalUser)).toBeNull();
    expect(request.cookies.has(cookieName)).toBe(false);
    expect(request.setCookieCalls.at(-1)?.options.maxAge).toBe(0);
  });

  it("re-sends the cookie when the session is renewed", async () => {
    const { id: userId } = await createUser();
    await run(startSession(userId));
    const token = request.cookies.get(cookieName)!;
    const id = await run(hashToken(token));
    const soon = new Date(Date.now() + 60_000).toISOString();
    await sqlRun((sql) => sql`UPDATE sessions SET expires_at = ${soon} WHERE id = ${id}`);
    request.setCookieCalls.length = 0;
    expect((await run(getOptionalUser))?.id).toBe(userId);
    expect(request.setCookieCalls).toHaveLength(1);
    expect(request.setCookieCalls[0]).toMatchObject({ name: cookieName, value: token });
  });

  it("logout (endSession) deletes the row and clears the cookie", async () => {
    const { id: userId } = await createUser();
    await run(startSession(userId));
    await run(endSession);
    expect(request.cookies.has(cookieName)).toBe(false);
    const rows = await sqlRun((sql) => sql`SELECT id FROM sessions WHERE user_id = ${userId}`);
    expect(rows).toHaveLength(0);
    expect(await run(getOptionalUser)).toBeNull();
  });

  it("requireUser fails with Unauthenticated when signed out", async () => {
    const exit = await runExit(requireUser);
    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain("Unauthenticated");
  });

  it("requireAdmin rejects members and accepts admins", async () => {
    const member = await createUser({ role: "MEMBER" });
    await run(startSession(member.id));
    expect((await run(requireUser)).id).toBe(member.id);
    const error = await failureOf(requireAdmin);
    expect(error._tag).toBe("Forbidden");

    const admin = await createUser({ role: "ADMIN" });
    await run(startSession(admin.id));
    expect((await run(requireAdmin)).id).toBe(admin.id);
  });
});

describe("redirectTo validation", () => {
  it.each([
    ["/", "/"],
    ["/recipes", "/recipes"],
    ["/recipes/abc?tab=notes#n1", "/recipes/abc?tab=notes#n1"],
    ["/search?q=a%2F%2Fb", "/search?q=a%2F%2Fb"],
  ])("allows the same-origin path %s", (input, expected) => {
    expect(safeRedirectTo(input)).toBe(expected);
  });

  it.each([
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "\\/evil.com",
    "https://evil.com",
    "http://evil.com/",
    "HTTPS://evil.com",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "evil.com",
    "recipes",
    " /recipes",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/\u0000/evil.com",
    "/ /evil.com",
    "/ /evil.com",
    "/ /evil.com",
    "/\\t/evil.com",
    "/recipes\\..\\..\\evil",
    "",
    "/login",
    "/logout",
    "/".concat("a".repeat(5000)),
  ])("rejects %j", (input) => {
    expect(safeRedirectTo(input)).toBe("/");
  });

  it("rejects non-strings and uses the given fallback", () => {
    for (const value of [undefined, null, 42, {}, ["/recipes"]]) expect(safeRedirectTo(value)).toBe("/");
    expect(safeRedirectTo("//evil.com", "/profile")).toBe("/profile");
  });

  it("never produces a value the browser would resolve off-origin", () => {
    const tricky = ["/%2F%2Fevil.com", "/%5Cevil.com", "/./evil.com", "/..//evil.com", "/a/../..//evil.com", "/@evil.com"];
    for (const value of tricky) {
      const result = safeRedirectTo(value);
      expect(new URL(result, "https://cookbook.example").origin).toBe("https://cookbook.example");
      expect(result.startsWith("//")).toBe(false);
    }
    expect(safeRedirectTo("/a/../..//evil.com")).toBe("/");
    expect(safeRedirectTo("/..//evil.com")).toBe("/");
    {
    }
  });
});

describe("same-origin check", () => {
  const make = (headers: Record<string, string>) =>
    new Request("https://cookbook.example/_serverFn/x", { method: "POST", headers });

  it("accepts same-origin browser requests", () => {
    expect(isSameOriginRequest(make({ "Sec-Fetch-Site": "same-origin" }))).toBe(true);
    expect(isSameOriginRequest(make({ Origin: "https://cookbook.example" }))).toBe(true);
  });

  it("refuses cross-site, same-site and header-less requests", () => {
    expect(isSameOriginRequest(make({ "Sec-Fetch-Site": "cross-site", Origin: "https://cookbook.example" }))).toBe(false);
    expect(isSameOriginRequest(make({ "Sec-Fetch-Site": "same-site" }))).toBe(false);
    expect(isSameOriginRequest(make({ Origin: "https://evil.example" }))).toBe(false);
    expect(isSameOriginRequest(make({ Origin: "http://cookbook.example" }))).toBe(false);
    expect(isSameOriginRequest(make({ Origin: "null" }))).toBe(false);
    expect(isSameOriginRequest(make({}))).toBe(false);
  });
});
