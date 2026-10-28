import { createFileRoute } from "@tanstack/react-router";
import { FavoritesList, validateSortSearch } from "~/components/recipe-actions/favorites-list";
import { getFavorites } from "~/server/favorites.functions";

export const Route = createFileRoute("/favorites/$categoryId")({
  validateSearch: validateSortSearch,
  loaderDeps: ({ search }) => ({ sort: search.sort }),
  loader: ({ params, deps }) => getFavorites({ data: { categoryId: params.categoryId, sort: deps.sort } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Favorites by category - ${loaderData.categoryName}` : "Favorites" },
      { name: "description", content: "Your favorite recipes in this category" },
    ],
  }),
  component: FavoritesInCategory,
});

function FavoritesInCategory() {
  const { recipes } = Route.useLoaderData();
  const { sort = "asc" } = Route.useSearch();
  return <FavoritesList recipes={recipes} sort={sort} />;
}
