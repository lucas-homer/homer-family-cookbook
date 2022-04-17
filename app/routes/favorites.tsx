import { json, LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getFavoriteRecipes } from "~/models/user.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  favoriteRecipesData: Awaited<ReturnType<typeof getFavoriteRecipes>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const favoriteRecipesData = await getFavoriteRecipes(userId);
  return json<LoaderData>({
    favoriteRecipesData,
  });
};

export default function Categories() {
  const { favoriteRecipesData } = useLoaderData() as LoaderData;
  // TODO -- might be nice to sort these by category, like in routes/categories.tsx
  return (
    <div className="relative min-h-screen bg-white ">
      <h2 className="mb-8 text-2xl">Favorite Recipes</h2>
      <ul className="mb-4 flex flex-wrap gap-4">
        {favoriteRecipesData.length ? (
          favoriteRecipesData.map((item) => (
            <li key={item.recipe.id} className="mb-2 text-xl">
              <h2 className="text-xl">
                <Link to={`/recipes/${item.recipeId}`}>
                  {item.recipe.title}
                </Link>
              </h2>
            </li>
          ))
        ) : (
          <p>You don't have any favorite recipes yet!</p>
        )}
      </ul>
    </div>
  );
}
