import { Note, Recipe } from "@prisma/client";
import { prisma } from "~/lib/db.server";

export async function getRecipeNotes(recipeId: Recipe["id"]) {
  return prisma.note.findMany({
    where: {
      recipeId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      author: true,
    },
  });
}

export async function createNote({
  content,
  recipeId,
  userId,
}: {
  content: Note["content"];
  recipeId: Note["recipeId"];
  userId: Note["userId"];
}) {
  return prisma.note.create({
    data: {
      content,
      userId,
      recipeId,
    },
  });
}

export async function updateNote({
  content,
  noteId,
}: {
  content: Note["content"];
  noteId: Note["id"];
}) {
  return prisma.note.update({
    where: {
      id: noteId,
    },
    data: {
      content,
    },
    include: {
      author: true,
    },
  });
}

export async function deleteNote(noteId: Note["id"]) {
  return prisma.note.delete({
    where: { id: noteId },
  });
}
