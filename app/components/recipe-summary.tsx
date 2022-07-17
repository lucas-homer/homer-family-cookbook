import { Recipe, RecipeRead, User } from "@prisma/client";
import { EyeOpenIcon } from "@radix-ui/react-icons";
import { Link } from "@remix-run/react";
import { formatRecipeDate } from "~/lib/utils";

type Props = {
  recipe: Recipe & { author: User };
  lastViewed?: RecipeRead["updatedAt"];
};

export default function RecipeSummary({ recipe, lastViewed }: Props) {
  const lastViewedDate = lastViewed ? formatRecipeDate(lastViewed) : undefined;
  const authorName = `${recipe.author.firstName ?? ""} ${
    recipe.author.lastName ?? ""
  }`;

  return (
    <article className=" max-w-lg  rounded-lg bg-white p-3 hover:bg-zinc-50">
      <Link to={`/recipes/${recipe.id}`}>
        {lastViewedDate ? (
          <div className="flex items-center gap-1 text-zinc-500">
            <EyeOpenIcon width={12} />
            <p className="text-xs">
              <span>{lastViewedDate}</span>
            </p>
          </div>
        ) : null}
        <h3 className="text-2xl">{recipe.title}</h3>

        <p className="text-lg text-zinc-500">By: {authorName}</p>
      </Link>
    </article>
  );
}
