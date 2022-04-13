import { json, LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { getRecipesByCategory } from "~/models/recipe.server";

type LoaderData = {
  recipes: Awaited<ReturnType<typeof getRecipesByCategory>>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.categoryId, "categoryId not found");

  return json<LoaderData>({
    recipes: await getRecipesByCategory(params.categoryId),
  });
};

export default function CategoryID() {
  const data = useLoaderData() as LoaderData;

  return data.recipes.length ? (
    <ul>
      {data.recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
        </li>
      ))}
    </ul>
  ) : (
    <div>No recipes in this category</div>
  );
}
