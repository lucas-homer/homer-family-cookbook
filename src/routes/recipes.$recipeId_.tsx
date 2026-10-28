import { createFileRoute, Link } from "@tanstack/react-router";
import { getRecipe } from "~/server/recipes/read";
import { getRecipeViewerData } from "~/server/recipes/viewer";
import { FavoriteButton } from "~/components/recipe-actions/favorite-button";
import { NotesSection } from "~/components/recipe-actions/notes-section";
export const Route = createFileRoute("/recipes/$recipeId_")({
  loader: async ({ params }) => {
    const recipe = await getRecipe({ data: { recipeId: params.recipeId } });
    const viewer = await getRecipeViewerData({
      data: { recipeId: params.recipeId },
    });
    return { recipe, viewer };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.recipe.title ?? "Recipe not found" },
      {
        name: "description",
        content: loaderData
          ? `By ${[loaderData.recipe.firstName, loaderData.recipe.lastName].filter(Boolean).join(" ")}`
          : "Recipe not found",
      },
    ],
  }),
  component: Recipe,
});
function Recipe() {
  const { recipe, viewer } = Route.useLoaderData();
  return (
    <div className="md:py-32">
      <article>
        <h1 className="mb-2 text-4xl">{recipe.title}</h1>
        <p className="mb-3 text-lg text-zinc-500">
          By: {[recipe.firstName, recipe.lastName].filter(Boolean).join(" ")}
        </p>
        <div className="mb-4 flex items-center gap-6">
          {viewer.canEditRecipe && (
            <a
              className="underline underline-offset-4"
              href={`/recipes/${encodeURIComponent(recipe.id)}/edit`}
            >
              Edit
            </a>
          )}
          <FavoriteButton
            recipeId={recipe.id}
            isFavorite={viewer.isFavorite}
            signedIn={Boolean(viewer.user)}
          />
        </div>
        {recipe.background && (
          <p className="mb-8 max-w-lg whitespace-pre-line text-lg leading-relaxed italic">
            {recipe.background}
          </p>
        )}
        {recipe.servings && (
          <p className="mb-8 text-lg">
            <span className="font-bold uppercase">Servings: </span>
            {recipe.servings}
          </p>
        )}
        <h2 className="mb-2 font-bold uppercase">Ingredients</h2>
        <ul className="mb-8">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id} className="mb-3 text-lg">
              --{" "}
              {[ingredient.quantity, ingredient.name].filter(Boolean).join(" ")}
            </li>
          ))}
        </ul>
        <h2 className="mb-2 font-bold uppercase">Instructions</h2>
        <p className="mb-8 max-w-lg whitespace-pre-line text-lg leading-relaxed">
          {recipe.instructions}
        </p>
        <h2 className="mb-2 font-bold uppercase">Categories</h2>
        <ul className="mb-8 flex flex-wrap gap-8">
          {recipe.categories.map((category) => (
            <li key={category.id}>
              <Link
                to="/categories/$categoryId"
                params={{ categoryId: category.id }}
                search={{ sort: "asc" }}
                className="text-lg underline underline-offset-4"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </article>
      <hr className="my-12 border-zinc-200" />
      <NotesSection recipeId={recipe.id} viewer={viewer} />
    </div>
  );
}
