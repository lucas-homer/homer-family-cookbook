import bcrypt from "bcryptjs";
import { Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { beforeAll, describe, expect, it } from "vitest";
import { handleApiRequest } from "~/server/api/handler";
import { MAX_MEDIA_PER_RECIPE } from "~/server/media";
import { deleteRecipe } from "~/server/recipes/write";
import { runtime } from "~/server/runtime";

const BASE = "https://cookbook.example/api/v1/";

const send = (path: string, init: RequestInit & { token?: string } = {}) => {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  return runtime.runPromise(handleApiRequest(new Request(BASE + path, { ...init, headers })));
};
const call = async (path: string, init: RequestInit & { token?: string } = {}) => {
  const response = await send(path, init);
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, any>) : null };
};

// A tiny "JPEG": the magic bytes are all the type check looks at.
const jpeg = (size = 64): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  for (let i = 4; i < size; i++) bytes[i] = i % 251;
  return bytes;
};

const upload = (recipeId: string, token: string | undefined, bytes: Uint8Array<ArrayBuffer>, type = "image/jpeg", length = bytes.byteLength) =>
  call(`recipes/${recipeId}/media?width=1200&height=800`, {
    method: "POST",
    token,
    body: bytes,
    headers: { "Content-Type": type, "Content-Length": String(length) },
  });

let ada = "";
let ben = "";

beforeAll(async () => {
  const hash = bcrypt.hashSync("correct horse battery", 4);
  await runtime.runPromise(
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`INSERT INTO users (id, email, first_name, password_hash) VALUES
        ('m-ada', 'm-ada@example.test', 'Ada', ${hash}), ('m-ben', 'm-ben@example.test', 'Ben', ${hash})`;
      yield* sql`INSERT INTO recipes (id, title, instructions, user_id) VALUES
        ('m-1', 'Biscuits', 'Bake hot', 'm-ada'), ('m-2', 'Pie', 'Bake slow', 'm-ada'), ('m-3', 'Gone', 'Bye', 'm-ada')`;
    }),
  );
  const signIn = async (email: string) =>
    (await call("auth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "correct horse battery" }) }))
      .body!.token as string;
  ada = await signIn("m-ada@example.test");
  ben = await signIn("m-ben@example.test");
});

describe("recipe media", () => {
  it("lets the author add a photo, lists it on the recipe and serves it back", async () => {
    const bytes = jpeg();
    const res = await upload("m-1", ada, bytes);
    expect(res.status).toBe(201);
    expect(res.body?.media).toMatchObject({ kind: "photo", contentType: "image/jpeg", width: 1200, height: 800 });
    const id = res.body!.media.id as string;

    const recipe = await call("recipes/m-1");
    expect(recipe.body?.recipe.media).toEqual([{ id, kind: "photo", contentType: "image/jpeg", width: 1200, height: 800 }]);

    const library = await call("recipes");
    expect(library.body?.recipes.find((r: { id: string }) => r.id === "m-1").coverMediaId).toBe(id);

    const file = await send(`media/${id}`);
    expect(file.status).toBe(200);
    expect(file.headers.get("Content-Type")).toBe("image/jpeg");
    expect(file.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);

    const part = await send(`media/${id}`, { headers: { Range: "bytes=4-9" } });
    expect(part.status).toBe(206);
    expect(part.headers.get("Content-Range")).toBe(`bytes 4-9/${bytes.byteLength}`);
    expect(new Uint8Array(await part.arrayBuffer())).toEqual(bytes.slice(4, 10));
  });

  it("needs a signed-in owner", async () => {
    expect((await upload("m-1", undefined, jpeg())).status).toBe(401);
    expect((await upload("m-1", ben, jpeg())).status).toBe(403);
    expect((await upload("nope", ada, jpeg())).status).toBe(404);
  });

  it("rejects files that aren't what they say, unknown types and short bodies", async () => {
    const html = new Uint8Array(new TextEncoder().encode("<html><script>alert(1)</script></html>"));
    const fake = await upload("m-2", ada, html);
    expect(fake.status).toBe(400);
    expect(fake.body?.fieldErrors.file).toMatch(/doesn't look like/);

    const svg = await upload("m-2", ada, jpeg(), "image/svg+xml");
    expect(svg.status).toBe(400);
    expect(svg.body?.fieldErrors).toHaveProperty("contentType");

    const short = await upload("m-2", ada, jpeg(64), "image/jpeg", 128);
    expect(short.status).toBe(400);
    expect(short.body?.fieldErrors.file).toMatch(/didn't finish/);

    expect((await call("recipes/m-2")).body?.recipe.media).toEqual([]);
  });

  it(`stops at ${MAX_MEDIA_PER_RECIPE} per recipe`, async () => {
    for (let i = 0; i < MAX_MEDIA_PER_RECIPE; i++) expect((await upload("m-2", ada, jpeg())).status).toBe(201);
    const over = await upload("m-2", ada, jpeg());
    expect(over.status).toBe(400);
    expect(over.body?.fieldErrors.file).toMatch(/up to/);
  });

  it("lets only the owner remove a photo, and then stops serving it", async () => {
    const id = (await upload("m-3", ada, jpeg())).body!.media.id as string;
    expect((await call(`recipes/m-3/media/${id}`, { method: "DELETE", token: ben })).status).toBe(403);
    expect((await call(`recipes/m-3/media/${id}`, { method: "DELETE", token: ada })).status).toBe(200);
    expect((await send(`media/${id}`)).status).toBe(404);
    expect((await call(`recipes/m-3/media/${id}`, { method: "DELETE", token: ada })).status).toBe(404);
  });

  it("removes a deleted recipe's files", async () => {
    const id = (await upload("m-3", ada, jpeg())).body!.media.id as string;
    await runtime.runPromise(deleteRecipe({ id: "m-ada", role: "MEMBER" } as never, { recipeId: "m-3" }));
    expect((await send(`media/${id}`)).status).toBe(404);
    const { env } = await import("cloudflare:workers");
    expect(await (env as unknown as { MEDIA: R2Bucket }).MEDIA.head(`recipes/m-3/${id}`)).toBeNull();
  });
});
