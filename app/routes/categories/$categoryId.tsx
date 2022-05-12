import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import invariant from "tiny-invariant";
import RecipeSummary from "~/components/recipe-summary";
import { getCategoryNameById } from "~/models/category.server";
import { getRecipesByCategory } from "~/models/recipe.server";

type LoaderData = {
  recipes: Awaited<ReturnType<typeof getRecipesByCategory>>;
  categoryName: Awaited<ReturnType<typeof getCategoryNameById>>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.categoryId, "categoryId not found");
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") as "asc" | "desc" | undefined;

  return json<LoaderData>({
    recipes: await getRecipesByCategory(params.categoryId, sort),
    categoryName: await getCategoryNameById(params.categoryId),
  });
};

export const meta: MetaFunction = ({
  data,
}: {
  data: LoaderData | undefined;
}) => {
  if (!data) {
    return {
      title: "No recipes",
      description: "No recipes for the provided category",
    };
  }

  return {
    title: `Recipes by category - ${data?.categoryName}`,
    description: `All the recipes in the ${data.categoryName} category`,
  };
};

export default function CategoryID() {
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
