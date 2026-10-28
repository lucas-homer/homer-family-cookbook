import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SessionUser } from "./auth/current-user";
import { NotFound } from "./errors";
import { decodeInput, Id } from "./input";

// Favorites only ever touch the signed-in user's own rows (user_id = user.id).

export interface FavoriteRecipe {
  readonly id: string;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string | null;
}

const SetFavoriteInput = Schema.Struct({ recipeId: Id, favorite: Schema.Boolean });

// Sets rather than toggles, so a double click or a retry can't flip it back.
export const setFavorite = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { recipeId, favorite } = yield* decodeInput(SetFavoriteInput)(input);
    const sql = yield* SqlClient;
    if (favorite) {
      const rows = yield* sql<{ recipeId: string }>`
        INSERT INTO favorites (recipe_id, user_id)
        SELECT id, ${user.id} FROM recipes WHERE id = ${recipeId}
        ON CONFLICT (recipe_id, user_id) DO UPDATE SET recipe_id = excluded.recipe_id
        RETURNING recipe_id`;
      if (rows.length === 0) return yield* Effect.fail(new NotFound({ entity: "Recipe", id: recipeId }));
    } else {
      yield* sql`DELETE FROM favorites WHERE recipe_id = ${recipeId} AND user_id = ${user.id}`;
    }
    return { recipeId, favorite };
  });

export const listFavoriteCategories = (user: SessionUser) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{ id: string; name: string }>`
      SELECT DISTINCT c.id, c.name FROM categories c
      JOIN recipe_categories rc ON rc.category_id = c.id
      JOIN favorites f ON f.recipe_id = rc.recipe_id
      WHERE f.user_id = ${user.id}
      ORDER BY c.name COLLATE NOCASE, c.id`;
  });

const ListFavoritesInput = Schema.Struct({
  categoryId: Schema.optional(Schema.NullOr(Id)),
  sort: Schema.optional(Schema.Literals(["asc", "desc"])),
});

export const listFavorites = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { categoryId, sort } = yield* decodeInput(ListFavoritesInput)(input);
    const sql = yield* SqlClient;
    let categoryName: string | null = null;
    if (categoryId) {
      const rows = yield* sql<{ name: string }>`SELECT name FROM categories WHERE id = ${categoryId}`;
      if (!rows[0]) return yield* Effect.fail(new NotFound({ entity: "Category", id: categoryId }));
      categoryName = rows[0].name;
    }
    const filter = categoryId ?? null;
    const recipes =
      sort === "desc"
        ? yield* sql<FavoriteRecipe>`
            SELECT r.id, r.title, u.first_name, u.last_name
            FROM favorites f JOIN recipes r ON r.id = f.recipe_id JOIN users u ON u.id = r.user_id
            WHERE f.user_id = ${user.id}
              AND (${filter} IS NULL OR EXISTS (SELECT 1 FROM recipe_categories rc WHERE rc.recipe_id = r.id AND rc.category_id = ${filter}))
            ORDER BY r.title COLLATE NOCASE DESC, r.id`
        : yield* sql<FavoriteRecipe>`
            SELECT r.id, r.title, u.first_name, u.last_name
            FROM favorites f JOIN recipes r ON r.id = f.recipe_id JOIN users u ON u.id = r.user_id
            WHERE f.user_id = ${user.id}
              AND (${filter} IS NULL OR EXISTS (SELECT 1 FROM recipe_categories rc WHERE rc.recipe_id = r.id AND rc.category_id = ${filter}))
            ORDER BY r.title COLLATE NOCASE ASC, r.id`;
    return { categoryName, recipes };
  });
