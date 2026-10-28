import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { requireUser } from "./auth/current-user";
import { listFavoriteCategories, listFavorites, setFavorite } from "./favorites";
import { runServer } from "./run";

export const setFavoriteFn = createServerFn({ method: "POST" })
  .validator((input: { recipeId: string; favorite: boolean }) => input)
  .handler(({ data }) => runServer(Effect.flatMap(requireUser, (user) => setFavorite(user, data))));

export const getFavoriteCategories = createServerFn({ method: "GET" }).handler(() =>
  runServer(
    Effect.gen(function* () {
      const user = yield* requireUser;
      return { firstName: user.firstName, categories: yield* listFavoriteCategories(user) };
    }),
  ),
);

export const getFavorites = createServerFn({ method: "GET" })
  .validator((input: { categoryId?: string; sort?: "asc" | "desc" }) => input)
  .handler(({ data }) => runServer(Effect.flatMap(requireUser, (user) => listFavorites(user, data))));
