import { Note } from "@prisma/client";
import {
  ActionFunction,
  json,
  LoaderFunction,
  redirect,
} from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useParams } from "@remix-run/react";
import { useEffect, useRef } from "react";
import invariant from "tiny-invariant";
import NoteItem from "~/components/note";
import { badRequest } from "~/errors.server";
import {
  createNote,
  deleteNote,
  getRecipeNotes,
  updateNote,
} from "~/models/note.server";
import {
  favoriteRecipe,
  getRecipe,
  recordRecipeView,
  unfavoriteRecipe,
} from "~/models/recipe.server";
import { getUserId, requireUserId } from "~/session.server";
import { useOptionalUser } from "~/utils";

type LoaderData = {
  recipeData: Awaited<ReturnType<typeof getRecipe>>;
  notes: Awaited<ReturnType<typeof getRecipeNotes>>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.recipeId, "recipeId not found");
  const userId = await getUserId(request);

  const [recipeData, notes] = await Promise.all([
    getRecipe(params.recipeId),
    getRecipeNotes(params.recipeId),
  ]);

  if (!recipeData) {
    throw new Response("Recipe data not found.", {
      status: 404,
    });
  }

  if (userId) {
    await recordRecipeView({
      userId,
      recipeId: params.recipeId,
    });
  }

  return json<LoaderData>({ recipeData, notes });
};

export const actionIds = {
  favorite: "favorite",
  unfavorite: "unfavorite",
  addNote: "addNote",
  updateNote: "updateNote",
  deleteNote: "deleteNote",
};

function validateNoteContent(content: Note["content"]) {
  if (content.length < 3) {
    return `That note is too short.`;
  }
}

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const recipeId = params.recipeId;

  if (typeof recipeId !== "string") {
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }

  const form = await request.formData();
  const actionId = form.get("actionId");

  switch (actionId) {
    case actionIds.deleteNote: {
      const noteId = form.get("noteId");

      if (typeof noteId !== "string") {
        return badRequest({
          formError: `Form not submitted correctly.`,
        });
      }

      return deleteNote(noteId);
    }
    case actionIds.updateNote: {
      const noteId = form.get("noteId");
      const content = form.get("content");

      if (typeof content !== "string" || typeof noteId !== "string") {
        return badRequest({
          formError: `Form not submitted correctly.`,
        });
      }

      const fieldErrors = {
        content: validateNoteContent(content),
      };
      const fields = { content };

      if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest({ fieldErrors, fields });
      }

      return updateNote({
        noteId,
        content,
      });
    }
    case actionIds.addNote: {
      const content = form.get("content");

      if (typeof content !== "string") {
        return badRequest({
          formError: `Form not submitted correctly.`,
        });
      }

      const fieldErrors = {
        content: validateNoteContent(content),
      };
      const fields = { content };

      if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest({ fieldErrors, fields });
      }

      await createNote({
        userId,
        recipeId,
        content,
      });

      return redirect(`recipes/${recipeId}`);
    }
    case actionIds.unfavorite: {
      await unfavoriteRecipe({
        userId,
        recipeId,
      });
      return redirect(`recipes/${recipeId}`);
    }
    case actionIds.favorite: {
      await favoriteRecipe({
        userId,
        recipeId,
      });
      return redirect(`recipes/${recipeId}`);
    }
    default: {
      throw new Error(`Invalid actionId: ${actionId}`);
    }
  }
};

export default function Recipe() {
  const params = useParams();
  console.log("params", params);
  const { notes, recipeData } = useLoaderData() as LoaderData;
  const user = useOptionalUser();

  const createNoteFormRef = useRef<HTMLFormElement>(null);
  const createNoteContentRef = useRef<HTMLTextAreaElement>(null);

  const fetcher = useFetcher();
  const actionId = fetcher.submission?.formData.get("actionId");
  const isCreatingNote = actionId === actionIds.addNote;
  const isUpdatingFavorite =
    actionId === actionIds.favorite || actionId === actionIds.unfavorite;

  // after saving new note, reset and focus back into the new note input
  useEffect(() => {
    if (!isCreatingNote && fetcher.type !== "init") {
      createNoteContentRef.current?.focus();
      createNoteFormRef.current?.reset();
    }
  }, [isCreatingNote, fetcher.type]);

  const isRecipeFavorited =
    recipeData?.favoritedUsers?.some((item) => item.userId === user?.id) ??
    false;

  const favoriteButtonText = isUpdatingFavorite
    ? "Saving..."
    : isRecipeFavorited
    ? "REMOVE FROM FAVORITES"
    : "FAVORITE THIS RECIPE";

  const readerIsAuthor = recipeData?.userId === user?.id;

  return (
    <div className="md:py-32">
      {/* ****RECIPE*** */}
      <section className="">
        <div className="mb-4">
          <div className="flex justify-between">
            <h1 className="mb-2 text-4xl">{recipeData?.title}</h1>
            {readerIsAuthor ? (
              <Link
                to={`/recipes/${recipeData?.id}/edit`}
                className="underline underline-offset-4"
              >
                Edit Recipe
              </Link>
            ) : null}
          </div>
          {user ? (
            <fetcher.Form method="post">
              <button
                disabled={isUpdatingFavorite}
                type="submit"
                name="actionId"
                value={
                  isRecipeFavorited ? actionIds.unfavorite : actionIds.favorite
                }
              >
                {favoriteButtonText}
              </button>
            </fetcher.Form>
          ) : null}
        </div>

        <h3 className="mb-2 text-2xl">Ingredients</h3>
        <ul>
          {recipeData?.ingredients?.map((ingredient) => (
            <li key={ingredient.id} className="mb-3 text-lg">
              <p>{`-- ${ingredient.quantity} ${ingredient.name}`}</p>
            </li>
          ))}
        </ul>
        <br />
        <h3 className="mb-2 text-2xl">Instructions</h3>
        <p className="prose-lg mb-8 max-w-lg">{recipeData?.instructions}</p>
        <h4 className="text-md text-zinc-900">Categories</h4>
        <ul className="mb-8 flex gap-8 text-zinc-500">
          {recipeData?.categories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/categories/${category.id}`}
                className="text-lg text-zinc-900 underline underline-offset-4"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <hr className="my-12" />

      {/* ****NOTES*** */}
      <section>
        <h3 className="mb-2 text-2xl">Notes</h3>
        {user ? (
          <fetcher.Form method="post" ref={createNoteFormRef}>
            <fieldset disabled={fetcher.state === "submitting"}>
              <div className="flex flex-nowrap ">
                <div className="flex flex-col ">
                  <label className="font-bold" htmlFor="content">
                    Add:{" "}
                  </label>
                  <textarea
                    ref={createNoteContentRef}
                    id="content"
                    className="rounded-md border-2 border-solid border-gray-400"
                    name="content"
                    defaultValue={fetcher.data?.fields?.content}
                    aria-invalid={
                      Boolean(fetcher.data?.fieldErrors?.content) || undefined
                    }
                    aria-describedby={
                      fetcher.data?.fieldErrors?.content
                        ? "content-error"
                        : undefined
                    }
                  />
                  {fetcher.data?.fieldErrors?.content ? (
                    <p className="text-red-600" role="alert" id="content-error">
                      {fetcher.data.fieldErrors.content}
                    </p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className="ml-2 self-end rounded-md border-2  border-solid border-gray-400 py-1 px-2"
                  name="actionId"
                  value="addNote"
                >
                  {isCreatingNote ? "..." : "+"}
                </button>
              </div>
            </fieldset>
          </fetcher.Form>
        ) : (
          <h4>
            <Link to={`/login?redirectTo=/recipes/${params.recipeId}`}>
              Login to add note
            </Link>
          </h4>
        )}
        <ul className="mt-4">
          {notes.length ? (
            notes?.map((note) => {
              return (
                <li key={note.id} className="my-2 bg-stone-200 p-2">
                  {/* TODO -- add metadata and make sure we sort the data on server in reverse chronological order */}
                  <NoteItem
                    note={note}
                    isUserNoteAuthor={note.userId === user?.id}
                  />
                </li>
              );
            })
          ) : (
            <p>No notes for this recipe</p>
          )}
        </ul>
      </section>
    </div>
  );
}
