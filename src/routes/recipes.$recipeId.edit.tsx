import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RecipeForm } from "~/components/recipe-form/recipe-form";
import { deleteRecipeFn, getEditRecipeForm, updateRecipeFn } from "~/server/recipes/write.functions";

// Not nested under the read view: there is no `recipes.$recipeId.tsx` parent
// (the read view is `recipes.$recipeId_.tsx`), so this renders on its own.
export const Route = createFileRoute("/recipes/$recipeId/edit")({
  loader: ({ params }) => getEditRecipeForm({ data: { recipeId: params.recipeId } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Edit "${loaderData.recipe.title}"` : "Edit recipe" },
      { name: "description", content: "Make changes to a recipe" },
    ],
  }),
  component: EditRecipe,
});

function EditRecipe() {
  const { recipe, categories } = Route.useLoaderData();
  const router = useRouter();
  const updateRecipe = useServerFn(updateRecipeFn);
  const deleteRecipe = useServerFn(deleteRecipeFn);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toRecipe = () => router.navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id } });

  async function onDelete() {
    if (!window.confirm(`Delete "${recipe.title}"? This also removes its notes and can't be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteRecipe({ data: { recipeId: recipe.id } });
      await router.navigate({ to: "/categories" });
    } catch {
      setDeleteError("Couldn’t delete this recipe.");
      setDeleting(false);
    }
  }

  return (
    <section className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between md:mb-24">
        <h1 className="text-2xl font-bold">Edit Recipe</h1>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="text-md rounded-lg border-2 border-red-500 px-2 py-1 font-semibold text-red-500"
        >
          {deleting ? "Deleting..." : "Delete Recipe"}
        </button>
      </div>
      {deleteError ? (
        <p className="mb-4 text-red-600" role="alert">
          {deleteError}
        </p>
      ) : null}
      <RecipeForm
        categories={categories}
        initial={recipe}
        onCancel={toRecipe}
        onSubmit={async (values) => {
          const result = await updateRecipe({ data: { ...values, recipeId: recipe.id } });
          if (result.ok) {
            await router.invalidate();
            await toRecipe();
          }
          return result;
        }}
      />
    </section>
  );
}
