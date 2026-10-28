import { createFileRoute } from "@tanstack/react-router";
import { FavoritesList, validateSortSearch } from "~/components/recipe-actions/favorites-list";
import { getFavorites } from "~/server/favorites.functions";

export const Route = createFileRoute("/favorites/")({
  validateSearch: validateSortSearch,
  loaderDeps: ({ search }) => ({ sort: search.sort }),
  loader: ({ deps }) => getFavorites({ data: { sort: deps.sort } }),
  component: AllFavorites,
});

function AllFavorites() {
  const { recipes } = Route.useLoaderData();
  const { sort = "asc" } = Route.useSearch();
  return <FavoritesList recipes={recipes} sort={sort} />;
}
