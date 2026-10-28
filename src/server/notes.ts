import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SessionUser } from "./auth/current-user";
import { NotFound } from "./errors";
import { adminFlag, decodeInput, failNoAccess, Id, Text } from "./input";

// Notes on a recipe. Anyone signed in may add one; only the author or an admin
// may edit or delete it. Ownership is enforced in each statement's WHERE clause.

const Content = Text(3, 2000, "That note is too short.");
const AddNoteInput = Schema.Struct({ recipeId: Id, content: Content });
const UpdateNoteInput = Schema.Struct({ noteId: Id, content: Content });
const DeleteNoteInput = Schema.Struct({ noteId: Id });

export const addNote = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { recipeId, content } = yield* decodeInput(AddNoteInput)(input);
    const sql = yield* SqlClient;
    const id = crypto.randomUUID();
    // Selecting from recipes makes a missing recipe a no-op instead of an FK error.
    const rows = yield* sql<{ id: string }>`
      INSERT INTO notes (id, recipe_id, user_id, content)
      SELECT ${id}, id, ${user.id}, ${content} FROM recipes WHERE id = ${recipeId}
      RETURNING id`;
    if (rows.length === 0) return yield* Effect.fail(new NotFound({ entity: "Recipe", id: recipeId }));
    return { id };
  });

export const updateNote = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { noteId, content } = yield* decodeInput(UpdateNoteInput)(input);
    const sql = yield* SqlClient;
    const rows = yield* sql<{ id: string }>`
      UPDATE notes SET content = ${content}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ${noteId} AND (user_id = ${user.id} OR ${adminFlag(user)} = 1)
      RETURNING id`;
    if (rows.length === 0) return yield* failNoAccess("Note", noteId);
    return { id: noteId };
  });

export const deleteNote = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { noteId } = yield* decodeInput(DeleteNoteInput)(input);
    const sql = yield* SqlClient;
    const rows = yield* sql<{ id: string }>`
      DELETE FROM notes WHERE id = ${noteId} AND (user_id = ${user.id} OR ${adminFlag(user)} = 1)
      RETURNING id`;
    if (rows.length === 0) return yield* failNoAccess("Note", noteId);
    return { id: noteId };
  });
