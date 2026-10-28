import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { requireUser } from "../auth/current-user";
import { toFormResult } from "../input";
import { runServer } from "../run";
import { createRecipe, deleteRecipe, listCategories, readRecipeForEdit, updateRecipe, type RecipeInput } from "./write";

export const getNewRecipeForm = createServerFn({ method: "GET" }).handler(() =>
  runServer(Effect.andThen(requireUser, listCategories)),
);

export const getEditRecipeForm = createServerFn({ method: "GET" })
  .validator((input: { recipeId: string }) => input)
  .handler(({ data }) =>
    runServer(
      Effect.gen(function* () {
        const user = yield* requireUser;
        const recipe = yield* readRecipeForEdit(user, data);
        return { recipe, categories: yield* listCategories };
      }),
    ),
  );

export const createRecipeFn = createServerFn({ method: "POST" })
  .validator((input: RecipeInput) => input)
  .handler(({ data }) => runServer(toFormResult(Effect.flatMap(requireUser, (user) => createRecipe(user, data)))));

export const updateRecipeFn = createServerFn({ method: "POST" })
  .validator((input: RecipeInput & { recipeId: string }) => input)
  .handler(({ data }) => runServer(toFormResult(Effect.flatMap(requireUser, (user) => updateRecipe(user, data)))));

export const deleteRecipeFn = createServerFn({ method: "POST" })
  .validator((input: { recipeId: string }) => input)
  .handler(({ data }) => runServer(Effect.flatMap(requireUser, (user) => deleteRecipe(user, data))));
