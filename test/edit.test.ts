import { beforeAll, describe, expect, it } from "vitest";
import { createCategory } from "~/server/categories-admin";
import { updateName } from "~/server/profile";
import { createRecipe, deleteRecipe, readRecipeForEdit, updateRecipe } from "~/server/recipes/write";
import { admin, alice, bob, query, run, runError, seed, validRecipe } from "./edit-fixtures";

const ingredientsOf = (recipeId: string) =>
  query<{ name: string; quantity: string | null; position: number }>`SELECT name, quantity, position FROM ingredients WHERE recipe_id = ${recipeId} ORDER BY position`;
const categoriesOf = async (recipeId: string) =>
  (await query<{ categoryId: string }>`SELECT category_id FROM recipe_categories WHERE recipe_id = ${recipeId} ORDER BY category_id`).map((r) => r.categoryId);

beforeAll(seed);

describe("createRecipe", () => {
  it("stores the recipe, ingredients in order and categories", async () => {
    const { id } = await run(createRecipe(alice, { ...validRecipe, categoryIds: ["cat-dinner", "cat-dessert"] }));
    const [recipe] = await query<{ title: string; userId: string; servings: string }>`SELECT title, user_id, servings FROM recipes WHERE id = ${id}`;
    expect(recipe).toEqual({ title: "Pie", userId: "alice", servings: "8" });
    expect(await ingredientsOf(id)).toEqual([
      { name: "flour", quantity: "2 cups", position: 0 },
      { name: "butter", quantity: "1 stick", position: 1 },
      { name: "apples", quantity: null, position: 2 },
    ]);
    expect(await categoriesOf(id)).toEqual(["cat-dessert", "cat-dinner"]);
  });

  it("rejects bad input with field errors", async () => {
    const error = await runError(
      createRecipe(alice, { title: "  ", instructions: "x", categoryIds: [], ingredients: [{ name: "" }] }),
    );
    expect(error._tag).toBe("InvalidInput");
    expect(error._tag === "InvalidInput" && Object.keys(error.fieldErrors).sort()).toEqual([
      "categoryIds",
      "ingredients",
      "instructions",
      "title",
    ]);
  });

  it("rejects too many ingredients, unknown categories and non-objects", async () => {
    const many = Array.from({ length: 101 }, (_, i) => ({ name: `i${i}`, quantity: null }));
    expect(await runError(createRecipe(alice, { ...validRecipe, ingredients: many }))).toMatchObject({
      _tag: "InvalidInput",
      fieldErrors: { ingredients: expect.any(String) },
    });
    expect(await runError(createRecipe(alice, { ...validRecipe, categoryIds: ["nope"] }))).toMatchObject({
      _tag: "InvalidInput",
      fieldErrors: { categoryIds: "Unknown category" },
    });
    expect(await runError(createRecipe(alice, { ...validRecipe, title: "x".repeat(201) }))).toMatchObject({
      _tag: "InvalidInput",
      fieldErrors: { title: expect.any(String) },
    });
    expect((await runError(createRecipe(alice, "nope")))._tag).toBe("InvalidInput");
  });
});

describe("updateRecipe", () => {
  it("replaces ingredients in the new order and replaces categories", async () => {
    const { id } = await run(createRecipe(alice, { ...validRecipe, categoryIds: ["cat-dessert", "cat-side"] }));
    await run(
      updateRecipe(alice, {
        recipeId: id,
        ...validRecipe,
        title: "Apple pie",
        servings: "",
        categoryIds: ["cat-dinner"],
        ingredients: [
          { name: "apples", quantity: "6" },
          { name: "flour", quantity: "2 cups" },
        ],
      }),
    );
    const [recipe] = await query<{ title: string; servings: string | null }>`SELECT title, servings FROM recipes WHERE id = ${id}`;
    expect(recipe).toEqual({ title: "Apple pie", servings: null });
    expect(await ingredientsOf(id)).toEqual([
      { name: "apples", quantity: "6", position: 0 },
      { name: "flour", quantity: "2 cups", position: 1 },
    ]);
    expect(await categoriesOf(id)).toEqual(["cat-dinner"]);
  });

  it("forbids a non-author and changes nothing", async () => {
    const { id } = await run(createRecipe(alice, validRecipe));
    const error = await runError(
      updateRecipe(bob, { recipeId: id, ...validRecipe, title: "Hacked", categoryIds: ["cat-side"], ingredients: [{ name: "x" }] }),
    );
    expect(error._tag).toBe("Forbidden");
    const [recipe] = await query<{ title: string }>`SELECT title FROM recipes WHERE id = ${id}`;
    expect(recipe?.title).toBe("Pie");
    expect((await ingredientsOf(id)).map((i) => i.name)).toEqual(["flour", "butter", "apples"]);
    expect(await categoriesOf(id)).toEqual(["cat-dessert"]);
    expect((await runError(readRecipeForEdit(bob, { recipeId: id })))._tag).toBe("Forbidden");
  });

  it("lets an admin edit anyone's recipe", async () => {
    const { id } = await run(createRecipe(alice, validRecipe));
    await run(updateRecipe(admin, { recipeId: id, ...validRecipe, title: "Admin fix" }));
    const [recipe] = await query<{ title: string; userId: string }>`SELECT title, user_id FROM recipes WHERE id = ${id}`;
    expect(recipe).toEqual({ title: "Admin fix", userId: "alice" });
    expect((await run(readRecipeForEdit(admin, { recipeId: id }))).title).toBe("Admin fix");
  });

  it("reports a missing recipe as NotFound", async () => {
    expect((await runError(updateRecipe(alice, { recipeId: "missing", ...validRecipe })))._tag).toBe("NotFound");
  });
});

describe("deleteRecipe", () => {
  it("forbids a non-author", async () => {
    const { id } = await run(createRecipe(alice, validRecipe));
    expect((await runError(deleteRecipe(bob, { recipeId: id })))._tag).toBe("Forbidden");
    expect(await query`SELECT id FROM recipes WHERE id = ${id}`).toHaveLength(1);
  });

  it("lets the author delete, cascading children", async () => {
    const { id } = await run(createRecipe(alice, validRecipe));
    await run(deleteRecipe(alice, { recipeId: id }));
    expect(await query`SELECT id FROM recipes WHERE id = ${id}`).toHaveLength(0);
    expect(await ingredientsOf(id)).toHaveLength(0);
    expect(await categoriesOf(id)).toHaveLength(0);
  });

  it("lets an admin delete anyone's recipe", async () => {
    const { id } = await run(createRecipe(bob, validRecipe));
    await run(deleteRecipe(admin, { recipeId: id }));
    expect(await query`SELECT id FROM recipes WHERE id = ${id}`).toHaveLength(0);
  });
});

describe("admin categories and profile", () => {
  it("only admins create categories, names are unique", async () => {
    expect((await runError(createCategory(alice, { name: "Soup" })))._tag).toBe("Forbidden");
    await run(createCategory(admin, { name: "Soup", description: "" }));
    expect(await runError(createCategory(admin, { name: "soup" }))).toMatchObject({ _tag: "InvalidInput", fieldErrors: { name: expect.any(String) } });
    expect((await runError(createCategory(admin, { name: " " })))._tag).toBe("InvalidInput");
  });

  it("updates only the caller's own name", async () => {
    await run(updateName(bob, { firstName: " Robert ", lastName: "" }));
    const users = await query<{ id: string; firstName: string; lastName: string | null }>`SELECT id, first_name, last_name FROM users WHERE id IN ('alice', 'bob') ORDER BY id`;
    expect(users).toEqual([
      { id: "alice", firstName: "ALICE", lastName: null },
      { id: "bob", firstName: "Robert", lastName: null },
    ]);
    expect((await runError(updateName(bob, { firstName: "" })))._tag).toBe("InvalidInput");
  });
});
