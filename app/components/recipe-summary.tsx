import { Recipe } from "@prisma/client";
import { Link } from "@remix-run/react";
import { formatCreationDate } from "~/utils";

type Props = {
  recipe: Recipe;
};

export default function RecipeSummary({ recipe }: Props) {
  const prettyDate = formatCreationDate(recipe.createdAt);
  return (
    <article className=" max-w-lg  rounded-lg bg-white p-3 hover:bg-zinc-50">
      <Link to={`/recipes/${recipe.id}`}>
        <h3 className="text-2xl">{recipe.title}</h3>
        <p className="text-lg italic text-zinc-500">{prettyDate}</p>
      </Link>
    </article>
  );
}
