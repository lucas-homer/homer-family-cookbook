import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { getOptionalUser, type SessionUser } from "../auth/current-user";
import { runServer } from "../run";
import { readRecipeViewerData } from "./viewer-data";

// Per-viewer data for the recipe page: who is looking, whether they have
// favorited it, and the notes they may see. When a signed-in user calls this,
// it also records the recipe in their "recently viewed" list.
export interface RecipeNote {
  readonly id: string;
  readonly content: string;
  readonly createdAt: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly canEdit: boolean;
}

export interface RecipeViewerData {
  readonly user: SessionUser | null;
  readonly isFavorite: boolean;
  readonly canEditRecipe: boolean;
  readonly notes: ReadonlyArray<RecipeNote>;
}

export const getRecipeViewerData = createServerFn({ method: "POST" })
  .validator((input: { recipeId: string }) => input)
  .handler(({ data }) =>
    runServer(Effect.flatMap(getOptionalUser, (user) => readRecipeViewerData(user, data))),
  );
