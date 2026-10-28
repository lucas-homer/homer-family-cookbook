import { Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { beforeAll, describe, expect, it } from "vitest";
import { readRecipe } from "~/server/recipes/read";
import { readCategories, readCategory } from "~/server/categories/read";
import { runServer } from "~/server/run";
import { runtime } from "~/server/runtime";

beforeAll(async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`INSERT INTO users (id, email, first_name) VALUES ('read-user', 'read@example.test', 'Reader')`;
      yield* sql`INSERT INTO categories (id, name) VALUES ('read-z', 'Zebra'), ('read-a', 'Apple'), ('read-empty', 'Empty')`;
      yield* sql`INSERT INTO recipes (id, title, instructions, user_id) VALUES ('read-1', 'Zucchini', 'Cook', 'read-user'), ('read-2', 'apple pie', 'Bake', 'read-user')`;
      yield* sql`INSERT INTO recipe_categories (recipe_id, category_id) VALUES ('read-1', 'read-a'), ('read-2', 'read-a')`;
      yield* sql`INSERT INTO ingredients (id, recipe_id, position, name) VALUES ('read-i2', 'read-1', 2, 'Second'), ('read-i0', 'read-1', 0, 'First'), ('read-i1', 'read-1', 1, 'Middle')`;
    }),
  );
});
describe("public reads", () => {
  it("reads a recipe with ingredients in position order and author/categories", async () => {
    const recipe = await runtime.runPromise(readRecipe({ recipeId: "read-1" }));
    expect(recipe.ingredients.map((i) => i.name)).toEqual([
      "First",
      "Middle",
      "Second",
    ]);
    expect(recipe.firstName).toBe("Reader");
    expect(recipe.categories).toEqual([{ id: "read-a", name: "Apple" }]);
  });
  it("lists categories alphabetically and sorts category recipes both ways", async () => {
    expect(
      (await runtime.runPromise(readCategories)).map((c) => c.name),
    ).toEqual(["Apple", "Empty", "Zebra"]);
    const asc = await runtime.runPromise(
      readCategory({ categoryId: "read-a", sort: "asc" }),
    );
    const desc = await runtime.runPromise(
      readCategory({ categoryId: "read-a", sort: "desc" }),
    );
    expect(asc.recipes.map((r) => r.title)).toEqual(["apple pie", "Zucchini"]);
    expect(desc.recipes.map((r) => r.title)).toEqual(["Zucchini", "apple pie"]);
    expect(
      (
        await runtime.runPromise(
          readCategory({ categoryId: "read-empty", sort: "asc" }),
        )
      ).recipes,
    ).toEqual([]);
  });
  it("maps a missing recipe to router NotFound", async () => {
    await expect(
      runServer(readRecipe({ recipeId: "missing" })),
    ).rejects.toMatchObject({ isNotFound: true });
  });
  it("maps a missing category to router NotFound", async () => {
    await expect(
      runServer(readCategory({ categoryId: "missing", sort: "asc" })),
    ).rejects.toMatchObject({ isNotFound: true });
  });
});
