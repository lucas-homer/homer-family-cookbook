import { beforeAll, describe, expect, it } from "vitest";
import { createCategory, updateCategory } from "~/server/categories-admin";
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

  it("requires at least one Course tag", async () => {
    expect(await runError(createRecipe(alice, { ...validRecipe, categoryIds: ["cat-xmas"] }))).toMatchObject({
      _tag: "InvalidInput",
      fieldErrors: { categoryIds: "Pick at least one Course tag" },
    });
    const { id } = await run(createRecipe(alice, { ...validRecipe, categoryIds: ["cat-dessert", "cat-xmas"] }));
    expect(await categoriesOf(id)).toEqual(["cat-dessert", "cat-xmas"]);
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
      fieldErrors: { categoryIds: "Unknown tag" },
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
  it("only admins create tags, names are unique, groups are checked", async () => {
    expect((await runError(createCategory(alice, { name: "Soup", tagGroup: "course" })))._tag).toBe("Forbidden");
    const { id } = await run(createCategory(admin, { name: "Soup", description: "", tagGroup: "kind" }));
    expect(await query<{ tagGroup: string }>`SELECT tag_group FROM categories WHERE id = ${id}`).toEqual([{ tagGroup: "kind" }]);
    expect(await runError(createCategory(admin, { name: "soup", tagGroup: "course" }))).toMatchObject({ _tag: "InvalidInput", fieldErrors: { name: expect.any(String) } });
    expect((await runError(createCategory(admin, { name: " ", tagGroup: "course" })))._tag).toBe("InvalidInput");
    expect(await runError(createCategory(admin, { name: "Stew", tagGroup: "nonsense" }))).toMatchObject({ _tag: "InvalidInput", fieldErrors: { tagGroup: expect.any(String) } });
  });

  it("only admins rename or regroup tags, without name clashes", async () => {
    const { id } = await run(createCategory(admin, { name: "Holiday", tagGroup: "course" }));
    expect((await runError(updateCategory(alice, { categoryId: id, name: "Holidays", tagGroup: "occasion" })))._tag).toBe("Forbidden");
    await run(updateCategory(admin, { categoryId: id, name: "Holidays", description: "", tagGroup: "occasion" }));
    expect(await query<{ name: string; tagGroup: string }>`SELECT name, tag_group FROM categories WHERE id = ${id}`).toEqual([
      { name: "Holidays", tagGroup: "occasion" },
    ]);
    // Same name with different case on the same tag is fine; another tag's name is not.
    await run(updateCategory(admin, { categoryId: id, name: "holidays", tagGroup: "occasion" }));
    expect(await runError(updateCategory(admin, { categoryId: id, name: "DESSERT", tagGroup: "occasion" }))).toMatchObject({
      _tag: "InvalidInput",
      fieldErrors: { name: expect.any(String) },
    });
    expect((await runError(updateCategory(admin, { categoryId: "missing", name: "X", tagGroup: "course" })))._tag).toBe("NotFound");
  });

  it("won't move a tag out of Course if a recipe would be left without one", async () => {
    const { id: onlyCourse } = await run(createCategory(admin, { name: "Soups", tagGroup: "course" }));
    const { id: other } = await run(createCategory(admin, { name: "Stews", tagGroup: "course" }));
    const { id: recipeId } = await run(createRecipe(alice, { ...validRecipe, categoryIds: [onlyCourse] }));
    expect(await runError(updateCategory(admin, { categoryId: onlyCourse, name: "Soups", tagGroup: "kind" }))).toMatchObject({
      _tag: "InvalidInput",
      fieldErrors: { tagGroup: expect.any(String) },
    });
    expect(await query<{ tagGroup: string }>`SELECT tag_group FROM categories WHERE id = ${onlyCourse}`).toEqual([{ tagGroup: "course" }]);
    // Once the recipe has another Course tag, the move is allowed.
    await run(updateRecipe(alice, { recipeId, ...validRecipe, categoryIds: [onlyCourse, other] }));
    await run(updateCategory(admin, { categoryId: onlyCourse, name: "Soups", tagGroup: "kind" }));
    expect(await query<{ tagGroup: string }>`SELECT tag_group FROM categories WHERE id = ${onlyCourse}`).toEqual([{ tagGroup: "kind" }]);
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
