import { beforeAll, describe, expect, it } from "vitest";
import { addNote, deleteNote, updateNote } from "~/server/notes";
import { readRecipeViewerData } from "~/server/recipes/viewer-data";
import { createRecipe } from "~/server/recipes/write";
import { admin, alice, bob, query, run, runError, seed, validRecipe } from "./edit-fixtures";

let recipeId: string;

beforeAll(async () => {
  await seed();
  recipeId = (await run(createRecipe(alice, validRecipe))).id;
});

const contentOf = async (noteId: string) =>
  (await query<{ content: string }>`SELECT content FROM notes WHERE id = ${noteId}`)[0]?.content;

describe("notes", () => {
  it("lets a user add, edit and delete their own note", async () => {
    const { id } = await run(addNote(bob, { recipeId, content: "  Needs more salt  " }));
    expect(await contentOf(id)).toBe("Needs more salt");
    await run(updateNote(bob, { noteId: id, content: "Needs less salt" }));
    expect(await contentOf(id)).toBe("Needs less salt");
    await run(deleteNote(bob, { noteId: id }));
    expect(await contentOf(id)).toBeUndefined();
  });

  it("stops user B from editing or deleting user A's note (legacy IDOR)", async () => {
    const { id } = await run(addNote(alice, { recipeId, content: "Alice's note" }));
    expect((await runError(updateNote(bob, { noteId: id, content: "Bob was here" })))._tag).toBe("Forbidden");
    expect((await runError(deleteNote(bob, { noteId: id })))._tag).toBe("Forbidden");
    expect(await contentOf(id)).toBe("Alice's note");
  });

  it("lets an admin edit and delete anyone's note", async () => {
    const { id } = await run(addNote(alice, { recipeId, content: "Rude words" }));
    await run(updateNote(admin, { noteId: id, content: "[removed]" }));
    expect(await contentOf(id)).toBe("[removed]");
    await run(deleteNote(admin, { noteId: id }));
    expect(await contentOf(id)).toBeUndefined();
  });

  it("validates content and the recipe", async () => {
    expect(await runError(addNote(bob, { recipeId, content: "no" }))).toMatchObject({
      _tag: "InvalidInput",
      fieldErrors: { content: "That note is too short." },
    });
    expect((await runError(addNote(bob, { recipeId, content: "x".repeat(2001) })))._tag).toBe("InvalidInput");
    expect((await runError(addNote(bob, { recipeId: "missing", content: "Hello there" })))._tag).toBe("NotFound");
    expect((await runError(updateNote(bob, { noteId: "missing", content: "Hello there" })))._tag).toBe("NotFound");
  });

  it("viewer data marks only the viewer's own notes editable and hides emails", async () => {
    const { id: aliceNote } = await run(addNote(alice, { recipeId, content: "From Alice" }));
    const { id: bobNote } = await run(addNote(bob, { recipeId, content: "From Bob" }));

    const forBob = await run(readRecipeViewerData(bob, { recipeId }));
    expect(forBob.canEditRecipe).toBe(false);
    const editable = Object.fromEntries(forBob.notes.map((n) => [n.id, n.canEdit]));
    expect(editable[aliceNote]).toBe(false);
    expect(editable[bobNote]).toBe(true);
    expect(JSON.stringify(forBob.notes)).not.toContain("@example.com");

    const forAdmin = await run(readRecipeViewerData(admin, { recipeId }));
    expect(forAdmin.canEditRecipe).toBe(true);
    expect(forAdmin.notes.every((n) => n.canEdit)).toBe(true);

    const anonymous = await run(readRecipeViewerData(null, { recipeId }));
    expect(anonymous).toMatchObject({ user: null, isFavorite: false, canEditRecipe: false });
    expect(anonymous.notes).toEqual([]);
    expect((await run(readRecipeViewerData(alice, { recipeId }))).canEditRecipe).toBe(true);
  });
});
