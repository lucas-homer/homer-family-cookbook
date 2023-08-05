import { useEffect, useRef, useState } from "react";
import { Note } from "@prisma/client";
import { actionIds } from "~/routes/recipes/$recipeId";
import { useActionData, useFetcher } from "@remix-run/react";
import { Textarea } from "./ui/textarea";

type NoteProps = {
  note: Note;
  isUserNoteAuthor: boolean;
};

export default function NoteItem({ note, isUserNoteAuthor }: NoteProps) {
  const fetcher = useFetcher();
  const actionId = fetcher.submission?.formData.get("actionId");
  const isEditingNote = actionId === actionIds.updateNote;
  const isDeletingNote = actionId === actionIds.deleteNote;

  const actionData = useActionData();

  const [editNoteFormData, setEditNoteForm] = useState<Note | null>(null);
  const editNoteFormRef = useRef<HTMLFormElement>(null);
  const editNoteContentRef = useRef<HTMLTextAreaElement>(null);

  // after saving note update, reset and change out of edit mode
  useEffect(() => {
    if (!isEditingNote) {
      editNoteFormRef.current && editNoteFormRef.current.reset();
      setEditNoteForm(null);
    }
  }, [isEditingNote]);

  // focus the input after opening edit form
  useEffect(() => {
    if (fetcher.state === "idle" && editNoteFormData) {
      editNoteContentRef.current?.focus();
    }
  }, [fetcher.state, editNoteFormData]);

  return (
    <>
      {editNoteFormData?.id !== note.id ? (
        <div className="flex flex-nowrap justify-between">
          <p>{note.content}</p>
          {isUserNoteAuthor ? (
            <button
              onClick={() => {
                setEditNoteForm(note);
              }}
              disabled={fetcher.state === "loading"}
            >
              edit
            </button>
          ) : null}
        </div>
      ) : (
        <fetcher.Form method="post" ref={editNoteFormRef}>
          <div className="flex flex-nowrap justify-between">
            <div>
              <input hidden name="noteId" defaultValue={note.id} />
              <Textarea
                disabled={fetcher.state === "submitting"}
                ref={editNoteContentRef}
                id="content"
                name="content"
                defaultValue={editNoteFormData.content}
                aria-invalid={
                  Boolean(actionData?.fieldErrors?.content) || undefined
                }
                aria-describedby={
                  actionData?.fieldErrors?.content ? "content-error" : undefined
                }
              />
              {actionData?.fieldErrors?.content ? (
                <p className="text-red-600" role="alert" id="content-error">
                  {actionData.fieldErrors.content}
                </p>
              ) : null}
            </div>
            <button onClick={() => setEditNoteForm(null)} type="button">
              cancel
            </button>
            <button type="submit" name="actionId" value="deleteNote">
              {isDeletingNote ? "deleting..." : "delete"}
            </button>
            <button
              type="submit"
              name="actionId"
              value="updateNote"
              disabled={fetcher.state === "submitting"}
            >
              {isEditingNote ? "saving..." : "save"}
            </button>
          </div>
        </fetcher.Form>
      )}
    </>
  );
}
