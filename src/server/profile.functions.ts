import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { requireUser } from "./auth/current-user";
import { toFormResult } from "./input";
import { readProfile, updateName } from "./profile";
import { runServer } from "./run";

export const getProfile = createServerFn({ method: "GET" }).handler(() => runServer(Effect.flatMap(requireUser, readProfile)));

export const updateNameFn = createServerFn({ method: "POST" })
  .validator((input: { firstName: string; lastName: string }) => input)
  .handler(({ data }) => runServer(toFormResult(Effect.flatMap(requireUser, (user) => updateName(user, data)))));
