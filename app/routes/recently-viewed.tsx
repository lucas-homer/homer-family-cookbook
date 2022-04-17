import { json, LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getRecentlyViewed } from "~/models/user.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  recipes: Awaited<ReturnType<typeof getRecentlyViewed>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const recipes = await getRecentlyViewed(userId);

  return json<LoaderData>({ recipes });
};

export default function RecentlyViewed() {
  const { recipes } = useLoaderData() as LoaderData;
  return (
    <div className="relative min-h-screen bg-white ">
      <h2 className="mb-8 text-2xl">Recently Viewed Recipes</h2>
      <ul className="mb-4">
        {recipes.length ? (
          recipes.map((item) => (
            <li key={item.recipe.id} className="mb-2 text-xl">
              <h2 className="text-xl">
                <Link to={`/recipes/${item.recipeId}`}>
                  {item.recipe.title}
                </Link>
              </h2>
            </li>
          ))
        ) : (
          <p>You don't have any recently viewed recipes yet!</p>
        )}
      </ul>
    </div>
  );
}
