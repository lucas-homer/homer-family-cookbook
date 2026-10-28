import { Link } from "@tanstack/react-router";
import type { RecipeSummaryData } from "~/server/recipes/read";

export function RecipeSummary({ recipe }: { recipe: RecipeSummaryData }) {
  return (
    <article className="max-w-lg rounded-lg p-3 hover:bg-zinc-50">
      <Link
        to="/recipes/$recipeId"
        params={{ recipeId: recipe.id }}
        className="block"
      >
        <h3 className="text-2xl">{recipe.title}</h3>
        <p className="text-lg text-zinc-500">
          By: {[recipe.firstName, recipe.lastName].filter(Boolean).join(" ")}
        </p>
      </Link>
    </article>
  );
}
