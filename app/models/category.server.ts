import { prisma } from "~/db.server";
import { Category, User } from "@prisma/client";

export async function getCategories() {
  return prisma.category.findMany({});
}

// get all categories of recipes favorited by user
export async function getFavoriteCategories(userId: User["id"]) {
  const allCategories = await prisma.category.findMany({
    include: {
      recipes: {
        select: {
          favoritedUsers: {
            where: {
              userId: userId,
            },
          },
        },
      },
    },
  });

  const filtered = allCategories.filter((currentCategory) => {
    return currentCategory.recipes.length > 0;
  });

  return filtered;
}

export async function createCategory(name: Category["name"]) {
  return prisma.category.create({
    data: {
      name,
    },
  });
}

export async function getCategoryNameById(categoryId: Category["id"]) {
  return prisma.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      name: true,
    },
  });
}
