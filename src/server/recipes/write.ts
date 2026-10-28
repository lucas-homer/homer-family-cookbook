import { D1Client } from "@effect/sql-d1";
import { Effect, Schema } from "effect";
import type { Statement } from "effect/sql/Statement";
import type { SessionUser } from "../auth/current-user";
import { InvalidInput, NotFound } from "../errors";
import { adminFlag, decodeInput, emptyToNull, failNoAccess, Id, isAdmin, OptionalText, Text } from "../input";

// Creating, editing and deleting recipes. Authors change their own recipes;
// admins can change any. Each write is one atomic D1 batch, and every
// statement in an edit or delete repeats the ownership check in its WHERE.

export const MAX_INGREDIENTS = 100;
export const MAX_CATEGORIES = 20;

const Ingredient = Schema.Struct({
  name: Text(1, 200, "Each ingredient must have a name"),
  quantity: OptionalText(100),
});

const RecipeFields = {
  title: Text(1, 200, "Title required"),
  servings: OptionalText(100),
  background: OptionalText(10_000),
  instructions: Text(3, 50_000, "At least three letters please :)"),
  categoryIds: Schema.Array(Id).check(
    Schema.isMinLength(1, { message: "At least one category required" }),
    Schema.isMaxLength(MAX_CATEGORIES, { message: `At most ${MAX_CATEGORIES} categories` }),
    Schema.isUnique({ message: "Categories must be unique" }),
  ),
  ingredients: Schema.Array(Ingredient).check(
    Schema.isMinLength(1, { message: "This recipe needs at least ONE ingredient" }),
    Schema.isMaxLength(MAX_INGREDIENTS, { message: `At most ${MAX_INGREDIENTS} ingredients` }),
  ),
};
export const RecipeInput = Schema.Struct(RecipeFields);
const UpdateRecipeInput = Schema.Struct({ recipeId: Id, ...RecipeFields });
const RecipeIdInput = Schema.Struct({ recipeId: Id });

export type RecipeInput = typeof RecipeInput.Encoded;


const checkCategoriesExist = (categoryIds: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const sql = yield* D1Client.D1Client;
    const rows = yield* sql<{ id: string }>`SELECT id FROM categories WHERE ${sql.in("id", categoryIds)}`;
    if (rows.length !== categoryIds.length) {
      return yield* Effect.fail(new InvalidInput({ fieldErrors: { categoryIds: "Unknown category" } }));
    }
  });

export const createRecipe = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const recipe = yield* decodeInput(RecipeInput)(input);
    yield* checkCategoriesExist(recipe.categoryIds);
    const sql = yield* D1Client.D1Client;
    const id = crypto.randomUUID();
    const statements: Array<Statement<unknown>> = [
      sql`INSERT INTO recipes (id, title, instructions, servings, background, user_id)
          VALUES (${id}, ${recipe.title}, ${recipe.instructions}, ${emptyToNull(recipe.servings)},
                  ${emptyToNull(recipe.background)}, ${user.id})`,
      ...recipe.ingredients.map(
        (ingredient, position) =>
          sql`INSERT INTO ingredients (id, recipe_id, position, name, quantity)
              VALUES (${crypto.randomUUID()}, ${id}, ${position}, ${ingredient.name}, ${emptyToNull(ingredient.quantity)})`,
      ),
      ...recipe.categoryIds.map(
        (categoryId) => sql`INSERT INTO recipe_categories (recipe_id, category_id) VALUES (${id}, ${categoryId})`,
      ),
    ];
    yield* sql.batch(statements);
    return { id };
  });

export const updateRecipe = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { recipeId, ...recipe } = yield* decodeInput(UpdateRecipeInput)(input);
    yield* checkCategoriesExist(recipe.categoryIds);
    const sql = yield* D1Client.D1Client;
    const admin = adminFlag(user);
    // True only when the caller owns the recipe (or is an admin). Repeated in
    // every statement so a non-owner's batch changes nothing at all.
    const owned = () =>
      sql`EXISTS (SELECT 1 FROM recipes WHERE id = ${recipeId} AND (user_id = ${user.id} OR ${admin} = 1))`;
    const statements: Array<Statement<unknown>> = [
      sql`UPDATE recipes SET title = ${recipe.title}, instructions = ${recipe.instructions},
            servings = ${emptyToNull(recipe.servings)}, background = ${emptyToNull(recipe.background)},
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ${recipeId} AND (user_id = ${user.id} OR ${admin} = 1)
          RETURNING id`,
      sql`DELETE FROM ingredients WHERE recipe_id = ${recipeId} AND ${owned()}`,
      sql`DELETE FROM recipe_categories WHERE recipe_id = ${recipeId} AND ${owned()}`,
      ...recipe.ingredients.map(
        (ingredient, position) =>
          sql`INSERT INTO ingredients (id, recipe_id, position, name, quantity)
              SELECT ${crypto.randomUUID()}, ${recipeId}, ${position}, ${ingredient.name}, ${emptyToNull(ingredient.quantity)}
              WHERE ${owned()}`,
      ),
      ...recipe.categoryIds.map(
        (categoryId) =>
          sql`INSERT INTO recipe_categories (recipe_id, category_id) SELECT ${recipeId}, ${categoryId} WHERE ${owned()}`,
      ),
    ];
    const [updated] = (yield* sql.batch(statements)) as unknown as [ReadonlyArray<unknown>];
    if (updated.length === 0) return yield* failNoAccess("Recipe", recipeId);
    return { id: recipeId };
  });

export const deleteRecipe = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { recipeId } = yield* decodeInput(RecipeIdInput)(input);
    const sql = yield* D1Client.D1Client;
    // Ingredients, categories, notes, favorites and reads cascade.
    const rows = yield* sql<{ id: string }>`
      DELETE FROM recipes WHERE id = ${recipeId} AND (user_id = ${user.id} OR ${adminFlag(user)} = 1)
      RETURNING id`;
    if (rows.length === 0) return yield* failNoAccess("Recipe", recipeId);
    return { id: recipeId };
  });

// Everything the edit form needs, after checking the caller may edit it.
export const readRecipeForEdit = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { recipeId } = yield* decodeInput(RecipeIdInput)(input);
    const sql = yield* D1Client.D1Client;
    const rows = yield* sql<{ id: string; title: string; instructions: string; servings: string | null; background: string | null; userId: string }>`
      SELECT id, title, instructions, servings, background, user_id FROM recipes WHERE id = ${recipeId}`;
    const recipe = rows[0];
    if (!recipe) return yield* Effect.fail(new NotFound({ entity: "Recipe", id: recipeId }));
    if (recipe.userId !== user.id && !isAdmin(user)) return yield* failNoAccess("Recipe", recipeId);
    const ingredients = yield* sql<{ name: string; quantity: string | null }>`
      SELECT name, quantity FROM ingredients WHERE recipe_id = ${recipeId} ORDER BY position, id`;
    const categoryRows = yield* sql<{ categoryId: string }>`
      SELECT category_id FROM recipe_categories WHERE recipe_id = ${recipeId}`;
    return { ...recipe, ingredients, categoryIds: categoryRows.map((row) => row.categoryId) };
  });

export const listCategories = Effect.gen(function* () {
  const sql = yield* D1Client.D1Client;
  return yield* sql<{ id: string; name: string }>`SELECT id, name FROM categories ORDER BY name COLLATE NOCASE, id`;
});
