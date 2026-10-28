import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";
import { addNoteFn, deleteNoteFn, updateNoteFn } from "~/server/notes.functions";
import type { RecipeNote, RecipeViewerData } from "~/server/recipes/viewer";

// Notes list plus add/edit/delete for the viewer's own notes (admins: all notes).
// Each change refetches the page loader with router.invalidate().
export function NotesSection({ recipeId, viewer }: { recipeId: string; viewer: RecipeViewerData }) {
  const router = useRouter();
  const addNote = useServerFn(addNoteFn);
  const formRef = useRef<HTMLFormElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = String(new FormData(event.currentTarget).get("content") ?? "");
    setPending(true);
    setError(null);
    try {
      const result = await addNote({ data: { recipeId, content } });
      if (!result.ok) {
        setError(result.fieldErrors.content ?? "Couldn’t save that note.");
        return;
      }
      formRef.current?.reset();
      await router.invalidate();
      contentRef.current?.focus();
    } catch {
      setError("Couldn’t save that note.");
    } finally {
      setPending(false);
    }
  }

  const loginHref = `/login?redirectTo=${encodeURIComponent(`/recipes/${recipeId}`)}`;

  return (
    <section>
      <h3 className="mb-2 text-2xl">Notes</h3>
      {viewer.user ? (
        <form ref={formRef} onSubmit={onAdd}>
          <fieldset disabled={pending}>
            <div className="flex flex-nowrap">
              <div className="flex flex-col">
                <label className="font-bold" htmlFor="new-note-content">
                  Add:{" "}
                </label>
                <textarea
                  ref={contentRef}
                  id="new-note-content"
                  name="content"
                  required
                  maxLength={2000}
                  className="rounded-md border-2 border-solid border-gray-400"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "new-note-error" : undefined}
                />
                {error ? (
                  <p className="text-red-600" role="alert" id="new-note-error">
                    {error}
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                aria-label="Add note"
                className="ml-2 self-end rounded-md border-2 border-solid border-gray-400 px-2 py-1"
              >
                {pending ? "..." : "+"}
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <h4>
          <a href={loginHref}>Sign in to see and add notes</a>
        </h4>
      )}
      {viewer.user && (
        <ul className="mt-4">
          {viewer.notes.length ? (
            viewer.notes.map((note) => (
              <li key={note.id} className="my-2 bg-stone-200 p-2">
                <NoteItem note={note} />
              </li>
            ))
          ) : (
            <p>No notes for this recipe</p>
          )}
        </ul>
      )}
    </section>
  );
}

function NoteItem({ note }: { note: RecipeNote }) {
  const router = useRouter();
  const updateNote = useServerFn(updateNoteFn);
  const deleteNote = useServerFn(deleteNoteFn);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorId = `note-${note.id}-error`;

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = String(new FormData(event.currentTarget).get("content") ?? "");
    setPending("save");
    setError(null);
    try {
      const result = await updateNote({ data: { noteId: note.id, content } });
      if (!result.ok) {
        setError(result.fieldErrors.content ?? "Couldn’t save that note.");
        return;
      }
      await router.invalidate();
      setEditing(false);
    } catch {
      setError("Couldn’t save that note.");
    } finally {
      setPending(null);
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete this note?")) return;
    setPending("delete");
    setError(null);
    try {
      await deleteNote({ data: { noteId: note.id } });
      await router.invalidate();
    } catch {
      setError("Couldn’t delete that note.");
      setPending(null);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-nowrap justify-between gap-4">
        <div>
          <p className="whitespace-pre-line">{note.content}</p>
          <p className="text-sm text-zinc-500">
            {note.authorName} · {formatDate(note.createdAt)}
          </p>
        </div>
        {note.canEdit ? (
          <button type="button" className="self-start" onClick={() => setEditing(true)}>
            edit
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSave}>
      <div className="flex flex-nowrap justify-between gap-2">
        <div>
          <label className="sr-only" htmlFor={`note-${note.id}-content`}>
            Edit note
          </label>
          <textarea
            id={`note-${note.id}-content`}
            name="content"
            autoFocus
            required
            maxLength={2000}
            disabled={pending !== null}
            className="rounded-md border-2 border-solid border-gray-400"
            defaultValue={note.content}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          {error ? (
            <p className="text-red-600" role="alert" id={errorId}>
              {error}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={() => setEditing(false)}>
          cancel
        </button>
        <button type="button" onClick={onDelete} disabled={pending !== null}>
          {pending === "delete" ? "deleting..." : "delete"}
        </button>
        <button type="submit" disabled={pending !== null}>
          {pending === "save" ? "saving..." : "save"}
        </button>
      </div>
    </form>
  );
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
