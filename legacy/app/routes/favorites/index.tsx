import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import {
  Link,
  useCatch,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";
import BoundaryMessage from "~/components/boundary-message";
import RecipeSummary from "~/components/recipe-summary";
import { getFavoriteRecipesByCategory } from "~/models/recipe.server";
import { requireUser } from "~/session.server";

type LoaderData = {
  recipes: Awaited<ReturnType<typeof getFavoriteRecipesByCategory>>;
  user: Awaited<ReturnType<typeof requireUser>>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") as "asc" | "desc" | undefined;

  return json<LoaderData>({
    recipes: await getFavoriteRecipesByCategory(user.id, null, sort),
    user,
  });
};

export const meta: MetaFunction = ({
  data,
}: {
  data: LoaderData | undefined;
}) => {
  if (!data) {
    return {
      title: "No favorites",
      description: "No favorite recipes found",
    };
  }
  return {
    title: `${data.user.firstName}'s Favorite Recipes`,
    description: `See the extra special ones`,
  };
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

export function CatchBoundary() {
  const caught = useCatch();
  switch (caught.status) {
    case 401: {
      return (
        <BoundaryMessage>
          <p className="text-xl">Sorry, but that's unauthorized around here.</p>
        </BoundaryMessage>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary() {
  return (
    <BoundaryMessage>
      <p className="text-xl">
        {`There was an error loading favorite recipes.`}
      </p>
    </BoundaryMessage>
  );
}
