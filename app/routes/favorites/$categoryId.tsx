import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { json, LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import invariant from "tiny-invariant";
import RecipeSummary from "~/components/recipe-summary";
import { getFavoriteRecipesByCategory } from "~/models/recipe.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  recipes: Awaited<ReturnType<typeof getFavoriteRecipesByCategory>>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.categoryId, "categoryId not found");
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") as "asc" | "desc" | undefined;

  return json<LoaderData>({
    recipes: await getFavoriteRecipesByCategory(
      userId,
      params.categoryId,
      sort
    ),
  });
};

export default function FavoriteCategoryID() {
  const data = useLoaderData() as LoaderData;
  const [searchParams] = useSearchParams();
  const sortDirection = searchParams?.get("sort") ?? "asc";
  const newSort = sortDirection === "desc" ? "asc" : "desc";

  return data.recipes.length ? (
    <>
      <Link
        to={`?sort=${newSort}`}
        className="mb-2 flex max-w-xs items-center gap-1"
      >
        {sortDirection === "desc" ? (
          <>
            <ChevronDownIcon className="" />
            <span>Sort: Z - A</span>
          </>
        ) : (
          <>
            <ChevronUpIcon className="" />
            <span>Sort: A - Z</span>
          </>
        )}
      </Link>

      <ul>
        {data.recipes.map((recipe) => (
          <li key={recipe.id}>
            <RecipeSummary recipe={recipe} />
          </li>
        ))}
      </ul>
    </>
  ) : (
    <p className="text-md my-6 text-zinc-500">No recipes in this category</p>
  );
}
