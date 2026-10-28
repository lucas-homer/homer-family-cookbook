import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { requireAdmin } from "./auth/current-user";
import { createCategory, listAdminCategories } from "./categories-admin";
import { toFormResult } from "./input";
import { runServer } from "./run";

export const getAdminCategories = createServerFn({ method: "GET" }).handler(() =>
  runServer(Effect.andThen(requireAdmin, listAdminCategories)),
);

export const createCategoryFn = createServerFn({ method: "POST" })
  .validator((input: { name: string; description: string }) => input)
  .handler(({ data }) => runServer(toFormResult(Effect.flatMap(requireAdmin, (user) => createCategory(user, data)))));
