import { useLoaderData } from "@remix-run/react";
import type {
  Recipe,
  RecipeRead,
  User,
  UsersFavoriteRecipes,
} from "@prisma/client";
import type { LoaderFunction } from "@remix-run/node";

import { requireUserId } from "~/lib/session.server";
import { getUserProfile } from "~/models/user.server";

type LoaderData = {
  user: User;
  recipes: Recipe[];
  favoriteRecipes: UsersFavoriteRecipes[];
  recipeReads: RecipeRead[];
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const data = await getUserProfile(userId);

  return data;
};

export default function Profile() {
  const { favoriteRecipes, recipeReads, recipes, ...user } =
    useLoaderData<LoaderData>();

  return (
    <>
      <h2>My User Info</h2>
      <pre>
        <code>{JSON.stringify(user, null, 2)}</code>
      </pre>
      <br />
      <h2>My Authored Recipes</h2>
      <pre>
        <code>{JSON.stringify(recipes, null, 2)}</code>
      </pre>
      <br />
      <h3>favorites</h3>
      <pre>
        <code>{JSON.stringify(favoriteRecipes, null, 2)}</code>
      </pre>
      <br />
      <h3>recently viewed</h3>
      <pre>
        <code>{JSON.stringify(recipeReads, null, 2)}</code>
      </pre>
    </>
  );
}
