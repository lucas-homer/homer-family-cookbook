import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { json, LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import RecipeSummary from "~/components/recipe-summary";
import { getRecentlyViewed } from "~/models/user.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  recipes: Awaited<ReturnType<typeof getRecentlyViewed>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") as "newest" | "oldest" | undefined;

  const recipes = await getRecentlyViewed(userId, sort);

  return json<LoaderData>({ recipes });
};

export default function RecentlyViewed() {
  const { recipes } = useLoaderData() as LoaderData;

  const [searchParams] = useSearchParams();
  const sortDirection = searchParams?.get("sort") ?? "newest"; // default to newest first
  const nextSort = sortDirection === "oldest" ? "newest" : "oldest";

  return (
    <div className="relative min-h-screen bg-white ">
      <h2 className="mb-4 text-2xl md:mb-24">Recently Viewed Recipes</h2>
      <ul className="mb-4">
        {recipes.length ? (
          <>
            <Link
              to={`?sort=${nextSort}`}
              className="mb-2 flex max-w-xs items-center gap-1"
            >
              {sortDirection === "newest" ? (
                <>
                  <ChevronDownIcon />
                  <span>Sort: Newest</span>
                </>
              ) : (
                <>
                  <ChevronUpIcon />
                  <span>Sort: Oldest</span>
                </>
              )}
            </Link>

            <ul>
              {recipes.map((item) => (
                <li key={item.recipeId} className="mb-4">
                  <RecipeSummary
                    recipe={item.recipe}
                    lastViewed={item.updatedAt}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>You don't have any recently viewed recipes yet!</p>
        )}
      </ul>
    </div>
  );
}
