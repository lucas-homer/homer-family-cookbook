import type { Password, User } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "~/db.server";

export type { User } from "@prisma/client";

export async function getUserById(id: User["id"]) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User["email"]) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getFavoriteRecipes(userId: User["id"]) {
  return prisma.usersFavoriteRecipes.findMany({
    where: { userId },
    include: {
      recipe: {
        include: {
          categories: true,
        },
      },
    },
  });
}

export async function getUserProfile(userId: User["id"]) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      recipes: true,
      favoriteRecipes: {
        include: {
          recipe: true,
        },
      },
      recipeReads: {
        include: {
          recipe: true,
        },
      },
    },
  });
}

export async function getRecentlyViewed(
  userId: User["id"],
  sort: "newest" | "oldest" = "newest"
) {
  return prisma.recipeRead.findMany({
    where: {
      userId,
    },
    orderBy: [
      {
        updatedAt: sort === "newest" ? "desc" : "asc",
      },
    ],
    include: {
      recipe: {
        include: {
          author: true,
        },
      },
    },
  });
}

export async function createUser(
  email: User["email"],
  password: string,
  firstName: string | null,
  lastName: string | null
) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });
}

export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(
  email: User["email"],
  password: Password["hash"]
) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
    include: {
      password: true,
    },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
