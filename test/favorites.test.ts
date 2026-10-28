import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { listFavoriteCategories, listFavorites, setFavorite } from "~/server/favorites";
import { listRecentlyViewed, recordRead } from "~/server/reads";
import { readRecipeViewerData } from "~/server/recipes/viewer-data";
import { createRecipe } from "~/server/recipes/write";
import { alice, bob, query, run, runError, seed, validRecipe } from "./edit-fixtures";

let pie: string;
let stew: string;
let salad: string;

beforeAll(async () => {
  await seed();
  pie = (await run(createRecipe(alice, { ...validRecipe, title: "Pie", categoryIds: ["cat-dessert"] }))).id;
  stew = (await run(createRecipe(alice, { ...validRecipe, title: "Stew", categoryIds: ["cat-dinner"] }))).id;
  salad = (await run(createRecipe(bob, { ...validRecipe, title: "Salad", categoryIds: ["cat-dinner", "cat-side"] }))).id;
});

describe("favorites", () => {
  it("sets and clears a favorite idempotently, per user", async () => {
    await run(setFavorite(bob, { recipeId: pie, favorite: true }));
    await run(setFavorite(bob, { recipeId: pie, favorite: true }));
    expect((await run(readRecipeViewerData(bob, { recipeId: pie }))).isFavorite).toBe(true);
    expect((await run(readRecipeViewerData(alice, { recipeId: pie }))).isFavorite).toBe(false);

    await run(setFavorite(bob, { recipeId: pie, favorite: false }));
    await run(setFavorite(bob, { recipeId: pie, favorite: false }));
    expect((await run(readRecipeViewerData(bob, { recipeId: pie }))).isFavorite).toBe(false);
  });

  it("rejects missing recipes and bad input", async () => {
    expect((await runError(setFavorite(bob, { recipeId: "missing", favorite: true })))._tag).toBe("NotFound");
    expect((await runError(setFavorite(bob, { recipeId: pie, favorite: "yes" })))._tag).toBe("InvalidInput");
  });

  it("lists favorites by category with sorting", async () => {
    await run(setFavorite(alice, { recipeId: stew, favorite: true }));
    await run(setFavorite(alice, { recipeId: salad, favorite: true }));
    await run(setFavorite(alice, { recipeId: pie, favorite: true }));

    expect((await run(listFavoriteCategories(alice))).map((c) => c.name)).toEqual(["Dessert", "Dinner", "Side"]);
    const all = await run(listFavorites(alice, {}));
    expect(all.recipes.map((r) => r.title)).toEqual(["Pie", "Salad", "Stew"]);
    const dinnerDesc = await run(listFavorites(alice, { categoryId: "cat-dinner", sort: "desc" }));
    expect(dinnerDesc).toMatchObject({ categoryName: "Dinner" });
    expect(dinnerDesc.recipes.map((r) => r.title)).toEqual(["Stew", "Salad"]);
    expect((await run(listFavorites(bob, {}))).recipes).toEqual([]);
    expect((await runError(listFavorites(alice, { categoryId: "missing" })))._tag).toBe("NotFound");
  });
});

describe("recently viewed", () => {
  // Viewer calls in the favorites tests above also record reads.
  beforeEach(() => query`DELETE FROM recipe_reads`);

  it("upserts one row per recipe and orders by last view", async () => {
    await run(recordRead(bob.id, pie, "2026-01-01T00:00:00.000Z"));
    await run(recordRead(bob.id, stew, "2026-01-02T00:00:00.000Z"));
    await run(recordRead(bob.id, salad, "2026-01-03T00:00:00.000Z"));
    await run(recordRead(bob.id, pie, "2026-01-04T00:00:00.000Z"));

    const rows = await query<{ createdAt: string; updatedAt: string }>`SELECT created_at, updated_at FROM recipe_reads WHERE user_id = 'bob' AND recipe_id = ${pie}`;
    expect(rows).toEqual([{ createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-04T00:00:00.000Z" }]);

    expect((await run(listRecentlyViewed(bob, {}))).map((r) => r.title)).toEqual(["Pie", "Salad", "Stew"]);
    expect((await run(listRecentlyViewed(bob, { sort: "oldest" }))).map((r) => r.title)).toEqual(["Stew", "Salad", "Pie"]);
    expect(await run(listRecentlyViewed(alice, {}))).toEqual([]);
    expect((await runError(listRecentlyViewed(bob, { sort: "sideways" })))._tag).toBe("InvalidInput");
  });

  it("viewing a recipe while signed in records a read; anonymous views do not", async () => {
    await run(readRecipeViewerData(null, { recipeId: stew }));
    expect(await query`SELECT 1 FROM recipe_reads`).toHaveLength(0);
    await run(readRecipeViewerData(alice, { recipeId: stew }));
    expect((await run(listRecentlyViewed(alice, {}))).map((r) => r.title)).toEqual(["Stew"]);
  });
});
