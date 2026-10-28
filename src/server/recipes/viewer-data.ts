import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SessionUser } from "../auth/current-user";
import { NotFound } from "../errors";
import { decodeInput, Id, isAdmin } from "../input";
import { recordRead } from "../reads";
import type { RecipeNote, RecipeViewerData } from "./viewer";

const ViewerInput = Schema.Struct({ recipeId: Id });

// Notes are private to signed-in family members: signed-out visitors get none.
// Only the author's display name leaves the server, never their email.
export const readRecipeViewerData = (user: SessionUser | null, input: unknown) =>
  Effect.gen(function* () {
    const { recipeId } = yield* decodeInput(ViewerInput)(input);
    const sql = yield* SqlClient;
    const recipes = yield* sql<{ userId: string }>`SELECT user_id FROM recipes WHERE id = ${recipeId}`;
    const recipe = recipes[0];
    if (!recipe) return yield* Effect.fail(new NotFound({ entity: "Recipe", id: recipeId }));
    if (!user) return { user: null, isFavorite: false, canEditRecipe: false, notes: [] } satisfies RecipeViewerData;

    const rows = yield* sql<{ id: string; content: string; createdAt: string; authorId: string; firstName: string; lastName: string | null }>`
      SELECT n.id, n.content, n.created_at, n.user_id AS author_id, u.first_name, u.last_name
      FROM notes n JOIN users u ON u.id = n.user_id
      WHERE n.recipe_id = ${recipeId}
      ORDER BY n.created_at DESC, n.id`;
    const notes = rows.map(
      (row): RecipeNote => ({
        id: row.id,
        content: row.content,
        createdAt: row.createdAt,
        authorId: row.authorId,
        authorName: [row.firstName, row.lastName].filter(Boolean).join(" "),
        canEdit: row.authorId === user.id || isAdmin(user),
      }),
    );

    const favorites = yield* sql`SELECT 1 AS found FROM favorites WHERE recipe_id = ${recipeId} AND user_id = ${user.id}`;
    yield* recordRead(user.id, recipeId);
    return {
      user,
      isFavorite: favorites.length > 0,
      canEditRecipe: recipe.userId === user.id || isAdmin(user),
      notes,
    } satisfies RecipeViewerData;
  });
