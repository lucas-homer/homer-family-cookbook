import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SessionUser } from "./auth/current-user";
import { NotFound } from "./errors";
import { decodeInput, emptyToNull, OptionalText, Text } from "./input";

// The signed-in user's own profile. Every query is scoped to user.id.

interface RecipeLink {
  readonly id: string;
  readonly title: string;
}

export const readProfile = (user: SessionUser) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const users = yield* sql<{ firstName: string; lastName: string | null; email: string; role: "ADMIN" | "MEMBER"; createdAt: string }>`
      SELECT first_name, last_name, email, role, created_at FROM users WHERE id = ${user.id}`;
    const me = users[0];
    if (!me) return yield* Effect.fail(new NotFound({ entity: "User", id: user.id }));
    const recipes = yield* sql<RecipeLink>`
      SELECT id, title FROM recipes WHERE user_id = ${user.id} ORDER BY title COLLATE NOCASE, id`;
    const favorites = yield* sql<RecipeLink>`
      SELECT r.id, r.title FROM favorites f JOIN recipes r ON r.id = f.recipe_id
      WHERE f.user_id = ${user.id} ORDER BY r.title COLLATE NOCASE, r.id`;
    const recentlyViewed = yield* sql<RecipeLink & { viewedAt: string }>`
      SELECT r.id, r.title, rr.updated_at AS viewed_at FROM recipe_reads rr JOIN recipes r ON r.id = rr.recipe_id
      WHERE rr.user_id = ${user.id} ORDER BY rr.updated_at DESC, r.id LIMIT 10`;
    return { user: me, recipes, favorites, recentlyViewed };
  });

const UpdateNameInput = Schema.Struct({
  firstName: Text(1, 100, "First name required"),
  lastName: OptionalText(100),
});

// Ported from legacy admin.profile.tsx, which let only admins rename themselves.
// Here anyone may change their own name; the statement can only touch user.id.
export const updateName = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { firstName, lastName } = yield* decodeInput(UpdateNameInput)(input);
    const sql = yield* SqlClient;
    yield* sql`
      UPDATE users SET first_name = ${firstName}, last_name = ${emptyToNull(lastName)},
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ${user.id}`;
    return { firstName, lastName: emptyToNull(lastName) };
  });
