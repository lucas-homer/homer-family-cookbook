import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import {
  Link,
  useCatch,
  useLoaderData,
  useParams,
  useSearchParams,
} from "@remix-run/react";
import invariant from "tiny-invariant";
import RecipeSummary from "~/components/recipe-summary";
import { getFavoriteRecipesByCategory } from "~/models/recipe.server";
import { getCategoryNameById } from "~/models/category.server";
import { requireUserId } from "~/lib/session.server";
import BoundaryMessage from "~/components/boundary-message";

type LoaderData = {
  recipes: Awaited<ReturnType<typeof getFavoriteRecipesByCategory>>;
  categoryName: Awaited<ReturnType<typeof getCategoryNameById>>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.categoryId, "categoryId not found");
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") as "asc" | "desc" | undefined;

  const [recipes, categoryName] = await Promise.all([
    await getFavoriteRecipesByCategory(userId, params.categoryId, sort),
    await getCategoryNameById(params.categoryId),
  ]);

  if (!recipes.length || !categoryName) {
    throw new Response("", {
      status: 404,
    });
  }

  return json<LoaderData>({
    recipes,
    categoryName,
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
    title: `Favorites by category - ${data?.categoryName}`,
    description: `All your favorite recipes in the ${data.categoryName} category`,
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
  const params = useParams();
  switch (caught.status) {
    case 404: {
      return (
        <BoundaryMessage>
          <p className="text-xl">
            The Category ID - {params.categoryId} - does not exist!
          </p>
        </BoundaryMessage>
      );
    }
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
  const { categoryId } = useParams();
  return (
    <BoundaryMessage>
      <p className="text-xl">
        {`There was an error loading favorite recipes with the Category id -- [${categoryId}].`}
      </p>
    </BoundaryMessage>
  );
}
