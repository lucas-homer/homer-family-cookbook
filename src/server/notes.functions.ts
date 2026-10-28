import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { requireUser } from "./auth/current-user";
import { toFormResult } from "./input";
import { addNote, deleteNote, updateNote } from "./notes";
import { runServer } from "./run";

export const addNoteFn = createServerFn({ method: "POST" })
  .validator((input: { recipeId: string; content: string }) => input)
  .handler(({ data }) => runServer(toFormResult(Effect.flatMap(requireUser, (user) => addNote(user, data)))));

export const updateNoteFn = createServerFn({ method: "POST" })
  .validator((input: { noteId: string; content: string }) => input)
  .handler(({ data }) => runServer(toFormResult(Effect.flatMap(requireUser, (user) => updateNote(user, data)))));

export const deleteNoteFn = createServerFn({ method: "POST" })
  .validator((input: { noteId: string }) => input)
  .handler(({ data }) => runServer(Effect.flatMap(requireUser, (user) => deleteNote(user, data))));
