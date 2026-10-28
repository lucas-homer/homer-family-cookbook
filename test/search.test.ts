import { Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { beforeAll, describe, expect, it } from "vitest";
import { searchRecipes } from "~/server/recipes/read";
import { runtime } from "~/server/runtime";
const search = (q: string) => runtime.runPromise(searchRecipes({ q }));
const execute = (effect: Parameters<typeof runtime.runPromise>[0]) =>
  runtime.runPromise(effect);
beforeAll(async () => {
  await execute(
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`INSERT INTO users (id, email, first_name) VALUES ('search-user', 'search@example.test', 'Reader')`;
      yield* sql`INSERT INTO recipes (id, title, instructions, background, user_id) VALUES ('search-1', 'Blueberry pancakes', 'Whisk gently then fry', 'Sunday tradition', 'search-user'), ('search-2', 'Tomato soup', 'Simmer slowly', '', 'search-user')`;
      yield* sql`INSERT INTO ingredients (id, recipe_id, position, name) VALUES ('search-i', 'search-1', 0, 'Buttermilk')`;
    }),
  );
});
describe("FTS search", () => {
  it("matches title, ingredient, instructions and background", async () => {
    for (const term of ["blueberry", "buttermilk", "whisk", "tradition"]) {
      expect((await search(term)).map((r) => r.id)).toEqual(["search-1"]);
    }
  });
  it("matches prefixes and combines words", async () => {
    expect((await search("blue pan")).map((r) => r.id)).toEqual(["search-1"]);
    expect(await search("blue tomato")).toEqual([]);
  });
  it("handles hostile MATCH input without throwing", async () => {
    for (const q of [
      '"',
      "AND(",
      "OR NOT NEAR(",
      "*",
      "title:(",
      '" OR 1=1 --',
      "(foo) + bar - baz",
      "",
      "   ",
      "🥞",
    ]) {
      await expect(search(q)).resolves.toBeInstanceOf(Array);
    }
  });
  it("keeps recipe updates and deletion indexed", async () => {
    await execute(
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE recipes SET title = 'Carrot stew', instructions = 'Roast carefully', background = 'Winter dinner' WHERE id = 'search-2'`;
      }),
    );
    expect(await search("tomato")).toEqual([]);
    expect((await search("carrot roast winter")).map((r) => r.id)).toEqual([
      "search-2",
    ]);
    await execute(
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`DELETE FROM recipes WHERE id = 'search-2'`;
        const stale =
          yield* sql`SELECT recipe_id FROM recipe_search WHERE recipe_id = 'search-2'`;
        expect(stale).toEqual([]);
      }),
    );
    expect(await search("carrot")).toEqual([]);
  });
  it("keeps ingredient insert, update, move and delete indexed", async () => {
    await execute(
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`INSERT INTO recipes (id, title, instructions, user_id) VALUES ('search-3', 'Other dish', 'Cook', 'search-user')`;
        yield* sql`INSERT INTO ingredients (id, recipe_id, position, name) VALUES ('search-extra', 'search-1', 1, 'Cinnamon')`;
      }),
    );
    expect((await search("cinn")).map((r) => r.id)).toEqual(["search-1"]);
    await execute(
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE ingredients SET name = 'Nutmeg', recipe_id = 'search-3' WHERE id = 'search-extra'`;
      }),
    );
    expect(await search("cinnamon")).toEqual([]);
    expect((await search("nutmeg")).map((r) => r.id)).toEqual(["search-3"]);
    await execute(
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`DELETE FROM ingredients WHERE id = 'search-extra'`;
      }),
    );
    expect(await search("nutmeg")).toEqual([]);
    await execute(
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`DELETE FROM recipes WHERE id = 'search-1'`;
        const stale =
          yield* sql`SELECT recipe_id FROM recipe_search WHERE recipe_id = 'search-1'`;
        expect(stale).toEqual([]);
      }),
    );
    expect(await search("buttermilk")).toEqual([]);
  });
});
