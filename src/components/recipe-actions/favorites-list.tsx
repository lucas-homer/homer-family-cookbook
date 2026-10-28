import { Link } from "@tanstack/react-router";
import { RecipeSummary } from "~/components/recipe/recipe-summary";
import type { FavoriteRecipe } from "~/server/favorites";

export type SortDirection = "asc" | "desc";

export const validateSortSearch = (search: Record<string, unknown>): { sort?: SortDirection } =>
  search.sort === "desc" ? { sort: "desc" } : {};

// Shared body of /favorites and /favorites/$categoryId.
export function FavoritesList({ recipes, sort }: { recipes: ReadonlyArray<FavoriteRecipe>; sort: SortDirection }) {
  if (!recipes.length) return <p className="text-md my-6 text-zinc-500">No recipes in this category</p>;
  return (
    <>
      <Link to="." search={sort === "desc" ? {} : { sort: "desc" }} className="mb-2 flex max-w-xs items-center gap-1">
        <span aria-hidden="true">{sort === "desc" ? "▾" : "▴"}</span>
        <span>Sort: {sort === "desc" ? "Z - A" : "A - Z"}</span>
      </Link>
      <ul>
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <RecipeSummary recipe={recipe} />
          </li>
        ))}
      </ul>
    </>
  );
}
