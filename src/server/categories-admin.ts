import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SessionUser } from "./auth/current-user";
import { Forbidden, InvalidInput } from "./errors";
import { decodeInput, emptyToNull, isAdmin, OptionalText, Text } from "./input";

// Admin-only category management (legacy admin.categories.tsx only created them).

const CreateCategoryInput = Schema.Struct({
  name: Text(1, 60, "Name required"),
  description: OptionalText(500),
});

const assertAdmin = (user: SessionUser) =>
  isAdmin(user) ? Effect.void : Effect.fail(new Forbidden({ reason: "Admins only" }));

export const createCategory = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    yield* assertAdmin(user);
    const { name, description } = yield* decodeInput(CreateCategoryInput)(input);
    const sql = yield* SqlClient;
    const id = crypto.randomUUID();
    // Insert only if no category already has this name (case-insensitive).
    const rows = yield* sql<{ id: string }>`
      INSERT INTO categories (id, name, description)
      SELECT ${id}, ${name}, ${emptyToNull(description)}
      WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ${name} COLLATE NOCASE)
      RETURNING id`;
    if (rows.length === 0) {
      return yield* Effect.fail(new InvalidInput({ fieldErrors: { name: "A category with that name already exists" } }));
    }
    return { id, name };
  });

export const listAdminCategories = Effect.gen(function* () {
  const sql = yield* SqlClient;
  return yield* sql<{ id: string; name: string; description: string | null; recipeCount: number }>`
    SELECT c.id, c.name, c.description, count(rc.recipe_id) AS recipe_count
    FROM categories c LEFT JOIN recipe_categories rc ON rc.category_id = c.id
    GROUP BY c.id ORDER BY c.name COLLATE NOCASE, c.id`;
});
