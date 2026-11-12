import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { InvalidInput, NotFound } from "../errors";
import { runServer } from "../run";
import type { RecipeSummaryData } from "../recipes/read";

// Categories are shown as grouped tags (see src/lib/tag-groups.ts). The table
// names stay categories / recipe_categories.

export interface TagData {
  readonly id: string;
  readonly name: string;
  readonly tagGroup: string;
}

// The most tags a browse page combines (the page's tag plus "narrow by" picks).
export const MAX_COMBINED_TAGS = 8;

export const readCategories = Effect.gen(function* () {
  const sql = yield* SqlClient;
  return yield* sql<TagData & { description: string | null; recipeCount: number }>`
    SELECT c.id, c.name, c.description, c.tag_group, count(rc.recipe_id) AS recipe_count
    FROM categories c LEFT JOIN recipe_categories rc ON rc.category_id = c.id
    GROUP BY c.id ORDER BY c.name COLLATE NOCASE, c.id`;
});
export const getCategories = createServerFn({ method: "GET" }).handler(() =>
  runServer(readCategories),
);

const ReadCategoryInput = Schema.Struct({
  categoryId: Schema.String,
  sort: Schema.Literals(["asc", "desc"]),
  with: Schema.optional(Schema.Array(Schema.String)),
});

// One tag's recipes, optionally narrowed to recipes that also have every tag
// in `with`. Also returns the other tags on those recipes, for narrowing.
export const readCategory = (input: unknown) =>
  Effect.gen(function* () {
    const { categoryId, sort, with: withIds = [] } = yield* Schema.decodeUnknownEffect(ReadCategoryInput)(input).pipe(
      Effect.mapError(
        () =>
          new InvalidInput({
            fieldErrors: { categoryId: "Invalid category or sort" },
          }),
      ),
    );
    const sql = yield* SqlClient;
    const rows = yield* sql<TagData & { description: string | null }>`
      SELECT id, name, description, tag_group FROM categories WHERE id = ${categoryId}`;
    const category = rows[0];
    if (!category)
      return yield* Effect.fail(
        new NotFound({ entity: "Category", id: categoryId }),
      );
    const extraIds = [...new Set(withIds)].filter((id) => id !== categoryId).slice(0, MAX_COMBINED_TAGS - 1);
    // Unknown ids in `with` are dropped rather than failing the page.
    const selected = extraIds.length
      ? yield* sql<TagData>`SELECT id, name, tag_group FROM categories WHERE ${sql.in("id", extraIds)}`
      : [];
    const ids = [categoryId, ...selected.map((tag) => tag.id)];
    const matching = sql`SELECT recipe_id FROM recipe_categories WHERE ${sql.in("category_id", ids)}
      GROUP BY recipe_id HAVING count(DISTINCT category_id) = ${ids.length}`;
    const recipes =
      sort === "desc"
        ? yield* sql<RecipeSummaryData>`SELECT r.id, r.title, u.first_name, u.last_name FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.id IN (${matching}) ORDER BY r.title COLLATE NOCASE DESC, r.id`
        : yield* sql<RecipeSummaryData>`SELECT r.id, r.title, u.first_name, u.last_name FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.id IN (${matching}) ORDER BY r.title COLLATE NOCASE ASC, r.id`;
    const related = yield* sql<TagData & { recipeCount: number }>`
      SELECT c.id, c.name, c.tag_group, count(*) AS recipe_count
      FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id
      WHERE rc.recipe_id IN (${matching}) AND NOT ${sql.in("c.id", ids)}
      GROUP BY c.id ORDER BY c.name COLLATE NOCASE, c.id`;
    return { category, selected, recipes, related };
  });
export const getCategory = createServerFn({ method: "GET" })
  .validator((input: { categoryId: string; sort: "asc" | "desc"; with?: ReadonlyArray<string> }) => input)
  .handler(({ data }) => runServer(readCategory(data)));
