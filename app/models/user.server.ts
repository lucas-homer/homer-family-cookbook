import type { Password, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "~/lib/db.server";
import { generateResetInfo, isTokenExpired } from "~/lib/password.server";

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
  sort: "newest" | "oldest" | undefined
) {
  return prisma.recipeRead.findMany({
    where: {
      userId,
    },
    orderBy: [
      {
        updatedAt: sort === "oldest" ? "asc" : "desc",
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
  firstName: User["firstName"],
  lastName: string | null
) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      firstName,
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

export async function updateUserPassword(
  email: User["email"],
  password: string
) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.update({
    where: { email },
    data: {
      password: {
        update: {
          hash: hashedPassword,
        },
      },
      resetExpires: null,
      resetToken: null,
    },
  });
}

export async function requestResetToken(email: User["email"]) {
  const user = await getUserByEmail(email);
  if (!user) {
    return { error: "User not found", status: 404 };
  }

  const { token, expiry } = await generateResetInfo();

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetExpires: expiry,
      },
    });

    return { token, status: 200 };
  } catch (e) {
    return { error: "Error creating reset token", status: 500 };
  }
}

export async function verifyToken(email: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { error: "User not found", status: 404 };
  }

  if (user.resetToken !== token) {
    return { error: "Invalid token", status: 401 };
  }

  if (user.resetExpires && isTokenExpired(user.resetExpires)) {
    return { error: "Token expired", status: 401 };
  }

  return { status: 200 };
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

export async function updateUserName(
  userId: User["id"],
  firstName: User["firstName"],
  lastName: User["lastName"]
) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      firstName,
      lastName,
    },
  });
}
