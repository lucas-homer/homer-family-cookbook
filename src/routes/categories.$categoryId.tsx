import { createFileRoute, Link } from "@tanstack/react-router";
import { getCategory } from "~/server/categories/read";
import { RecipeSummary } from "~/components/recipe/recipe-summary";
export const Route = createFileRoute("/categories/$categoryId")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { sort: "asc" | "desc" } => ({
    sort: search.sort === "desc" ? "desc" : "asc",
  }),
  loaderDeps: ({ search }) => ({ sort: search.sort }),
  loader: ({ params, deps }) =>
    getCategory({ data: { categoryId: params.categoryId, sort: deps.sort } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `Recipes by category - ${loaderData?.category.name ?? "Not found"}`,
      },
      {
        name: "description",
        content: `All the recipes in the ${loaderData?.category.name ?? "selected"} category`,
      },
    ],
  }),
  component: Category,
});
function Category() {
  const { category, recipes } = Route.useLoaderData();
  const { sort } = Route.useSearch();
  return recipes.length ? (
    <>
      <Link
        to="/categories/$categoryId"
        params={{ categoryId: category.id }}
        search={{ sort: sort === "desc" ? "asc" : "desc" }}
        className="mb-2 inline-block"
      >
        Sort: {sort === "desc" ? "Z - A ↓" : "A - Z ↑"}
      </Link>
      <ul>
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <RecipeSummary recipe={recipe} />
          </li>
        ))}
      </ul>
    </>
  ) : (
    <p className="my-6 text-zinc-500">No recipes in this category</p>
  );
}
