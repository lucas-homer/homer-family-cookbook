import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { InvalidInput, NotFound } from "../errors";
import { runServer } from "../run";
import type { RecipeSummaryData } from "../recipes/read";

export const readCategories = Effect.gen(function* () {
  const sql = yield* SqlClient;
  return yield* sql<{
    id: string;
    name: string;
    description: string | null;
  }>`SELECT id, name, description FROM categories ORDER BY name COLLATE NOCASE, id`;
});
export const getCategories = createServerFn({ method: "GET" }).handler(() =>
  runServer(readCategories),
);
export const readCategory = (input: unknown) =>
  Effect.gen(function* () {
    const { categoryId, sort } = yield* Schema.decodeUnknownEffect(
      Schema.Struct({
        categoryId: Schema.String,
        sort: Schema.Literals(["asc", "desc"]),
      }),
    )(input).pipe(
      Effect.mapError(
        () =>
          new InvalidInput({
            fieldErrors: { categoryId: "Invalid category or sort" },
          }),
      ),
    );
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      id: string;
      name: string;
      description: string | null;
    }>`SELECT id, name, description FROM categories WHERE id = ${categoryId}`;
    const category = rows[0];
    if (!category)
      return yield* Effect.fail(
        new NotFound({ entity: "Category", id: categoryId }),
      );
    const recipes =
      sort === "desc"
        ? yield* sql<RecipeSummaryData>`SELECT r.id, r.title, u.first_name, u.last_name FROM recipes r JOIN users u ON u.id = r.user_id JOIN recipe_categories rc ON rc.recipe_id = r.id WHERE rc.category_id = ${categoryId} ORDER BY r.title COLLATE NOCASE DESC, r.id`
        : yield* sql<RecipeSummaryData>`SELECT r.id, r.title, u.first_name, u.last_name FROM recipes r JOIN users u ON u.id = r.user_id JOIN recipe_categories rc ON rc.recipe_id = r.id WHERE rc.category_id = ${categoryId} ORDER BY r.title COLLATE NOCASE ASC, r.id`;
    return { category, recipes };
  });
export const getCategory = createServerFn({ method: "GET" })
  .validator((input: { categoryId: string; sort: "asc" | "desc" }) => input)
  .handler(({ data }) => runServer(readCategory(data)));
