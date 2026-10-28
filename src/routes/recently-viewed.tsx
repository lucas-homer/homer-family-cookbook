import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDate } from "~/components/recipe-actions/notes-section";
import { RecipeSummary } from "~/components/recipe/recipe-summary";
import { getRecentlyViewed } from "~/server/reads.functions";

export const Route = createFileRoute("/recently-viewed")({
  validateSearch: (search: Record<string, unknown>): { sort?: "oldest" } =>
    search.sort === "oldest" ? { sort: "oldest" } : {},
  loaderDeps: ({ search }) => ({ sort: search.sort }),
  loader: ({ deps }) => getRecentlyViewed({ data: { sort: deps.sort } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.firstName}'s Recently Viewed` : "Recently Viewed" },
      { name: "description", content: "Browse recipes you recently viewed" },
    ],
  }),
  component: RecentlyViewed,
});

function RecentlyViewed() {
  const { recipes } = Route.useLoaderData();
  const { sort } = Route.useSearch();
  const oldest = sort === "oldest";

  return (
    <div className="relative min-h-screen bg-white">
      <h1 className="mb-4 text-2xl md:mb-24">Recently Viewed Recipes</h1>
      {recipes.length ? (
        <>
          <Link to="/recently-viewed" search={oldest ? {} : { sort: "oldest" }} className="mb-2 flex max-w-xs items-center gap-1">
            <span aria-hidden="true">{oldest ? "▴" : "▾"}</span>
            <span>Sort: {oldest ? "Oldest" : "Newest"}</span>
          </Link>
          <ul>
            {recipes.map((recipe) => (
              <li key={recipe.id} className="mb-4">
                <p className="px-3 text-xs text-zinc-500">Viewed {formatDate(recipe.viewedAt)}</p>
                <RecipeSummary recipe={recipe} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>You don't have any recently viewed recipes yet!</p>
      )}
    </div>
  );
}
