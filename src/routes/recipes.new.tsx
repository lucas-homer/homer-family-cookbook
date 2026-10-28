import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RecipeForm } from "~/components/recipe-form/recipe-form";
import { createRecipeFn, getNewRecipeForm } from "~/server/recipes/write.functions";

export const Route = createFileRoute("/recipes/new")({
  loader: () => getNewRecipeForm(),
  head: () => ({
    meta: [{ title: "Create Recipe" }, { name: "description", content: "Add a recipe to the Homer Family Cookbook" }],
  }),
  component: NewRecipe,
});

function NewRecipe() {
  const categories = Route.useLoaderData();
  const router = useRouter();
  const createRecipe = useServerFn(createRecipeFn);

  return (
    <section className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold md:mb-24">Create Recipe</h1>
      <RecipeForm
        categories={categories}
        onCancel={() => router.history.back()}
        onSubmit={async (values) => {
          const result = await createRecipe({ data: values });
          if (result.ok) await router.navigate({ to: "/recipes/$recipeId", params: { recipeId: result.value.id } });
          return result;
        }}
      />
    </section>
  );
}
