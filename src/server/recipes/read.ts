import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { InvalidInput, NotFound } from "../errors";
import { runServer } from "../run";

export interface RecipeSummaryData {
  readonly id: string;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string | null;
}
interface RecipeRow extends RecipeSummaryData {
  readonly instructions: string;
  readonly servings: string | null;
  readonly background: string | null;
}
export const readRecipe = (input: unknown) =>
  Effect.gen(function* () {
    const { recipeId } = yield* Schema.decodeUnknownEffect(
      Schema.Struct({ recipeId: Schema.String }),
    )(input).pipe(
      Effect.mapError(
        () =>
          new InvalidInput({ fieldErrors: { recipeId: "Invalid recipe id" } }),
      ),
    );
    const sql = yield* SqlClient;
    const rows =
      yield* sql<RecipeRow>`SELECT r.id, r.title, r.instructions, r.servings, r.background, u.first_name, u.last_name FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.id = ${recipeId}`;
    const recipe = rows[0];
    if (!recipe)
      return yield* Effect.fail(
        new NotFound({ entity: "Recipe", id: recipeId }),
      );
    const ingredients = yield* sql<{
      id: string;
      name: string;
      quantity: string | null;
      position: number;
    }>`SELECT id, name, quantity, position FROM ingredients WHERE recipe_id = ${recipeId} ORDER BY position, id`;
    const categories = yield* sql<{
      id: string;
      name: string;
    }>`SELECT c.id, c.name FROM categories c JOIN recipe_categories rc ON rc.category_id = c.id WHERE rc.recipe_id = ${recipeId} ORDER BY c.name COLLATE NOCASE, c.id`;
    return { ...recipe, ingredients, categories };
  });
export const getRecipe = createServerFn({ method: "GET" })
  .validator((input: { recipeId: string }) => input)
  .handler(({ data }) => runServer(readRecipe(data)));

// Only Unicode words become MATCH terms. Quoting each word prevents operators,
// punctuation, and user-supplied quotes from becoming FTS syntax.
export function toPrefixQuery(query: string): string {
  return (query.slice(0, 500).match(/[\p{L}\p{N}]+/gu) ?? [])
    .slice(0, 32)
    .map((term) => `"${term}"*`)
    .join(" AND ");
}
export const searchRecipes = (input: unknown) =>
  Effect.gen(function* () {
    const { q } = yield* Schema.decodeUnknownEffect(
      Schema.Struct({ q: Schema.String }),
    )(input).pipe(
      Effect.mapError(
        () => new InvalidInput({ fieldErrors: { q: "Invalid search query" } }),
      ),
    );
    const match = toPrefixQuery(q);
    if (!match) return [];
    const sql = yield* SqlClient;
    return yield* sql<
      RecipeSummaryData & { snippet: string }
    >`SELECT r.id, r.title, u.first_name, u.last_name, snippet(recipe_search, -1, '', '', ' … ', 24) AS snippet FROM recipe_search JOIN recipes r ON r.id = recipe_search.recipe_id JOIN users u ON u.id = r.user_id WHERE recipe_search MATCH ${match} ORDER BY bm25(recipe_search, 0, 5, 2, 1, 1), r.title COLLATE NOCASE, r.id LIMIT 50`;
  });
export const getSearchResults = createServerFn({ method: "GET" })
  .validator((input: { q: string }) => input)
  .handler(({ data }) => runServer(searchRecipes(data)));
