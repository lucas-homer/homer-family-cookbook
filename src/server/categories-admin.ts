import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { TAG_GROUP_IDS } from "~/lib/tag-groups";
import type { SessionUser } from "./auth/current-user";
import { Forbidden, InvalidInput, NotFound } from "./errors";
import { decodeInput, emptyToNull, Id, isAdmin, OptionalText, Text } from "./input";

// Admin-only tag management. Tags live in the categories table.

const TagFields = {
  name: Text(1, 60, "Name required"),
  description: OptionalText(500),
  tagGroup: Schema.Literals(TAG_GROUP_IDS),
};
const CreateCategoryInput = Schema.Struct(TagFields);
const UpdateCategoryInput = Schema.Struct({ categoryId: Id, ...TagFields });

const assertAdmin = (user: SessionUser) =>
  isAdmin(user) ? Effect.void : Effect.fail(new Forbidden({ reason: "Admins only" }));

const duplicateName = new InvalidInput({ fieldErrors: { name: "A tag with that name already exists" } });

export const createCategory = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    yield* assertAdmin(user);
    const { name, description, tagGroup } = yield* decodeInput(CreateCategoryInput)(input);
    const sql = yield* SqlClient;
    const id = crypto.randomUUID();
    // Insert only if no tag already has this name (case-insensitive).
    const rows = yield* sql<{ id: string }>`
      INSERT INTO categories (id, name, description, tag_group)
      SELECT ${id}, ${name}, ${emptyToNull(description)}, ${tagGroup}
      WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ${name} COLLATE NOCASE)
      RETURNING id`;
    if (rows.length === 0) return yield* Effect.fail(duplicateName);
    return { id, name };
  });

// Rename, describe or move a tag to another group. Recipes keep the tag.
export const updateCategory = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    yield* assertAdmin(user);
    const { categoryId, name, description, tagGroup } = yield* decodeInput(UpdateCategoryInput)(input);
    const sql = yield* SqlClient;
    const existing = yield* sql<{ id: string }>`SELECT id FROM categories WHERE id = ${categoryId}`;
    if (!existing[0]) return yield* Effect.fail(new NotFound({ entity: "Category", id: categoryId }));
    // Moving a tag out of Course must not leave any recipe without a Course
    // tag (recipes need one to be saved). The check lives in the UPDATE so it
    // holds even if recipes change between a separate check and the write.
    const rows = yield* sql<{ id: string }>`
      UPDATE categories SET name = ${name}, description = ${emptyToNull(description)}, tag_group = ${tagGroup},
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ${categoryId}
        AND NOT EXISTS (SELECT 1 FROM categories WHERE name = ${name} COLLATE NOCASE AND id <> ${categoryId})
        AND (${tagGroup} = 'course' OR NOT EXISTS (
          SELECT 1 FROM recipe_categories rc
          WHERE rc.category_id = ${categoryId}
            AND NOT EXISTS (
              SELECT 1 FROM recipe_categories other JOIN categories c ON c.id = other.category_id
              WHERE other.recipe_id = rc.recipe_id AND c.tag_group = 'course' AND c.id <> ${categoryId})))
      RETURNING id`;
    if (rows.length === 0) {
      const clash = yield* sql<{ id: string }>`
        SELECT id FROM categories WHERE name = ${name} COLLATE NOCASE AND id <> ${categoryId}`;
      if (clash.length > 0) return yield* Effect.fail(duplicateName);
      return yield* Effect.fail(
        new InvalidInput({
          fieldErrors: { tagGroup: "Some recipes have no other Course tag. Give them another Course first." },
        }),
      );
    }
    return { id: categoryId, name };
  });

export const listAdminCategories = Effect.gen(function* () {
  const sql = yield* SqlClient;
  return yield* sql<{ id: string; name: string; description: string | null; tagGroup: string; recipeCount: number }>`
    SELECT c.id, c.name, c.description, c.tag_group, count(rc.recipe_id) AS recipe_count
    FROM categories c LEFT JOIN recipe_categories rc ON rc.category_id = c.id
    GROUP BY c.id ORDER BY c.name COLLATE NOCASE, c.id`;
});
