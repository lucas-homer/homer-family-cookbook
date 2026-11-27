import bcrypt from "bcryptjs";
import { Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { beforeAll, describe, expect, it } from "vitest";
import { handleApiRequest } from "~/server/api/handler";
import { createInvite } from "~/server/auth/invites";
import { runtime } from "~/server/runtime";

const BASE = "https://cookbook.example/api/v1/";

const call = async (path: string, init: RequestInit & { token?: string; body?: string } = {}) => {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await runtime.runPromise(handleApiRequest(new Request(BASE + path, { ...init, headers })));
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, any>) : null, headers: response.headers };
};

const signIn = async (email = "api@example.test", password = "correct horse battery") =>
  call("auth/token", { method: "POST", body: JSON.stringify({ email, password }) });

beforeAll(async () => {
  const hash = bcrypt.hashSync("correct horse battery", 4);
  await runtime.runPromise(
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`INSERT INTO users (id, email, first_name, last_name, password_hash) VALUES
        ('api-user', 'api@example.test', 'Ada', 'Homer', ${hash}),
        ('api-other', 'other@example.test', 'Ben', NULL, ${hash})`;
      yield* sql`INSERT INTO categories (id, name, tag_group) VALUES
        ('api-breads', 'Breads', 'course'), ('api-desserts', 'Desserts', 'course'), ('api-xmas', 'Christmas', 'occasion')`;
      yield* sql`INSERT INTO recipes (id, title, instructions, user_id) VALUES
        ('api-1', 'Buttermilk Biscuits', 'Bake hot', 'api-user'),
        ('api-2', 'apple cake', 'Bake slow', 'api-other')`;
      yield* sql`INSERT INTO recipe_categories (recipe_id, category_id) VALUES
        ('api-1', 'api-breads'), ('api-1', 'api-xmas'), ('api-2', 'api-desserts'), ('api-2', 'api-breads')`;
    }),
  );
});

describe("API auth", () => {
  it("issues a bearer token for a correct password and resolves /me with it", async () => {
    const res = await signIn();
    expect(res.status).toBe(201);
    expect(res.body?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.body?.user).toMatchObject({ id: "api-user", firstName: "Ada" });
    expect(res.body?.user).not.toHaveProperty("passwordHash");

    const me = await call("me", { token: res.body!.token });
    expect(me.status).toBe(200);
    expect(me.body?.user.id).toBe("api-user");
  });

  it("rejects a wrong password with a form error and no token", async () => {
    const res = await signIn("api@example.test", "nope");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "InvalidInput", fieldErrors: { form: "Invalid email or password" } });
  });

  it("ignores the session cookie and needs a bearer token", async () => {
    const { body } = await signIn();
    const res = await call("me", { headers: { Cookie: `session=${body!.token}` } });
    expect(res.status).toBe(401);
    expect((await call("me", { token: "x".repeat(43) })).status).toBe(401);
  });

  it("signs out by deleting the token", async () => {
    const { body } = await signIn();
    expect((await call("auth/token", { method: "DELETE", token: body!.token })).status).toBe(204);
    expect((await call("me", { token: body!.token })).status).toBe(401);
  });
});

describe("API reads", () => {
  it("lists the library A to Z with Course tags only", async () => {
    const res = await call("recipes");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.body?.recipes).toEqual([
      { id: "api-2", title: "apple cake", firstName: "Ben", lastName: null, coverMediaId: null, courses: ["Breads", "Desserts"] },
      { id: "api-1", title: "Buttermilk Biscuits", firstName: "Ada", lastName: "Homer", coverMediaId: null, courses: ["Breads"] },
    ]);
  });

  it("reads a recipe publicly, and adds favorite and edit rights when signed in", async () => {
    const anon = await call("recipes/api-1");
    expect(anon.body?.recipe.title).toBe("Buttermilk Biscuits");
    expect(anon.body?.viewer).toEqual({ isFavorite: false, canEditRecipe: false, notes: [] });

    const { body } = await signIn();
    const mine = await call("recipes/api-1", { token: body!.token });
    expect(mine.body?.viewer.canEditRecipe).toBe(true);
    const theirs = await call("recipes/api-2", { token: body!.token });
    expect(theirs.body?.viewer.canEditRecipe).toBe(false);
  });

  it("returns 404 JSON for a missing recipe or route, and 405 for a wrong method", async () => {
    expect(await call("recipes/nope")).toMatchObject({ status: 404, body: { error: "NotFound", entity: "Recipe" } });
    expect((await call("nothing-here")).status).toBe(404);
    const wrong = await call("recipes", { method: "POST" });
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get("Allow")).toBe("GET");
  });

  it("narrows a tag page with ?with= and sorts it", async () => {
    const res = await call("tags/api-breads?sort=desc");
    expect(res.body?.recipes.map((r: { id: string }) => r.id)).toEqual(["api-1", "api-2"]);
    const narrowed = await call("tags/api-breads?with=api-xmas");
    expect(narrowed.body?.recipes.map((r: { id: string }) => r.id)).toEqual(["api-1"]);
    expect(narrowed.body?.selected.map((t: { id: string }) => t.id)).toEqual(["api-xmas"]);
  });

  it("lists tags with counts and searches", async () => {
    const tags = await call("tags");
    expect(tags.body?.tags.find((t: { id: string }) => t.id === "api-breads").recipeCount).toBe(2);
    const search = await call("search?q=biscuit");
    expect(search.status).toBe(200);
    expect(Array.isArray(search.body?.results)).toBe(true);
  });
});

describe("API favorites", () => {
  it("needs a token", async () => {
    expect((await call("favorites")).status).toBe(401);
    expect((await call("favorites/api-1", { method: "PUT", body: JSON.stringify({ favorite: true }) })).status).toBe(401);
  });

  it("sets and lists the signed-in user's favorites, with Course tabs", async () => {
    const { body } = await signIn();
    const token = body!.token;
    expect((await call("favorites/api-2", { method: "PUT", token, body: JSON.stringify({ favorite: true }) })).body).toEqual({
      recipeId: "api-2",
      favorite: true,
    });
    const list = await call("favorites", { token });
    expect(list.body?.recipes.map((r: { id: string }) => r.id)).toEqual(["api-2"]);
    expect(list.body?.courses.map((c: { name: string }) => c.name)).toEqual(["Breads", "Desserts"]);
    expect((await call("recipes/api-2", { token })).body?.viewer.isFavorite).toBe(true);

    const bad = await call("favorites/api-2", { method: "PUT", token, body: JSON.stringify({ favorite: "yes" }) });
    expect(bad.status).toBe(400);
  });

  it("records reads for recently viewed", async () => {
    const { body } = await signIn("other@example.test");
    await call("recipes/api-1", { token: body!.token });
    const recent = await call("recently-viewed", { token: body!.token });
    expect(recent.body?.recipes.map((r: { id: string }) => r.id)).toEqual(["api-1"]);
  });
});

describe("API invites", () => {
  it("shows an open invite, joins with it, and then reports it used", async () => {
    const invite = await runtime.runPromise(createInvite({ email: "new@example.test", role: "MEMBER", expiresInDays: 14, createdBy: "api-user" }));
    const open = await call(`invites/${invite.token}`);
    expect(open).toMatchObject({ status: 200, body: { invite: { email: "new@example.test", role: "MEMBER" } } });

    const wrong = await call("auth/join", {
      method: "POST",
      body: JSON.stringify({ token: invite.token, email: "someone@example.test", firstName: "Cy", password: "long enough password" }),
    });
    expect(wrong.body?.fieldErrors).toHaveProperty("email");

    const joined = await call("auth/join", {
      method: "POST",
      body: JSON.stringify({ token: invite.token, email: "new@example.test", firstName: "Cy", password: "long enough password" }),
    });
    expect(joined.status).toBe(201);
    expect((await call("me", { token: joined.body!.token })).body?.user.firstName).toBe("Cy");

    expect(await call(`invites/${invite.token}`)).toMatchObject({ status: 410, body: { reason: "used" } });
  });

  it("rejects an unknown invite token", async () => {
    expect((await call(`invites/${"z".repeat(43)}`)).body?.reason).toBe("invalid");
  });
});

describe("API password reset", () => {
  it("accepts a request with 202 whether or not the email has an account", async () => {
    for (const email of ["api@example.test", "nobody@example.test"]) {
      const res = await call("auth/password-reset", { method: "POST", body: JSON.stringify({ email }) });
      expect(res).toMatchObject({ status: 202, body: { ok: true } });
    }
    expect((await call("auth/password-reset", { method: "POST", body: JSON.stringify({ email: "nope" }) })).status).toBe(400);
  });
});
