import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SessionUser } from "./auth/current-user";
import { decodeInput } from "./input";

// "Recently viewed": one recipe_reads row per (recipe, user), bumped on each view.

export const recordRead = (userId: string, recipeId: string, now: string = new Date().toISOString()) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`
      INSERT INTO recipe_reads (recipe_id, user_id, created_at, updated_at)
      VALUES (${recipeId}, ${userId}, ${now}, ${now})
      ON CONFLICT (recipe_id, user_id) DO UPDATE SET updated_at = excluded.updated_at`;
  });

export interface RecentlyViewedItem {
  readonly id: string;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string | null;
  readonly viewedAt: string;
}

const RecentlyViewedInput = Schema.Struct({ sort: Schema.optional(Schema.Literals(["newest", "oldest"])) });

export const listRecentlyViewed = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { sort } = yield* decodeInput(RecentlyViewedInput)(input);
    const sql = yield* SqlClient;
    return sort === "oldest"
      ? yield* sql<RecentlyViewedItem>`
          SELECT r.id, r.title, u.first_name, u.last_name, rr.updated_at AS viewed_at
          FROM recipe_reads rr JOIN recipes r ON r.id = rr.recipe_id JOIN users u ON u.id = r.user_id
          WHERE rr.user_id = ${user.id} ORDER BY rr.updated_at ASC, r.id LIMIT 200`
      : yield* sql<RecentlyViewedItem>`
          SELECT r.id, r.title, u.first_name, u.last_name, rr.updated_at AS viewed_at
          FROM recipe_reads rr JOIN recipes r ON r.id = rr.recipe_id JOIN users u ON u.id = r.user_id
          WHERE rr.user_id = ${user.id} ORDER BY rr.updated_at DESC, r.id LIMIT 200`;
  });
