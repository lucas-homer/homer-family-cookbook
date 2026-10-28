import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import RecipeSummary from "~/components/recipe-summary";
import { getRecentlyViewed } from "~/models/user.server";
import { requireUser } from "~/session.server";

type LoaderData = {
  recipes: Awaited<ReturnType<typeof getRecentlyViewed>>;
  user: Awaited<ReturnType<typeof requireUser>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") as "newest" | "oldest" | undefined;

  const recipes = await getRecentlyViewed(user.id, sort);

  return json<LoaderData>({ recipes, user });
};

export const meta: MetaFunction = ({ data }: { data: LoaderData }) => {
  if (!data) {
    return {
      title: `No recipes found`,
      description: `No recently viewed recipes found`,
    };
  }
  return {
    title: `${data.user.firstName}'s Recently Viewed`,
    description: `Browse recipes you recently viewed`,
  };
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
