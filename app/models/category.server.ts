import { prisma } from "~/db.server";
import { Category, User } from "@prisma/client";

export async function getCategories() {
  return prisma.category.findMany({});
}

// get all categories of recipes favorited by user
export async function getFavoriteCategories(userId: User["id"]) {
  // get user's favorite recipes
  const favoriteRecipes = await prisma.usersFavoriteRecipes.findMany({
    where: {
      userId,
    },
    include: {
      recipe: {
        include: {
          categories: true,
        },
      },
    },
  });

  // reduce down favoriteRecipes' categories to deduped list of categories
  const dedupedCategories = favoriteRecipes.reduce((acc, currentRecipe) => {
    const recipeCategories = currentRecipe.recipe.categories;

    const newCategories = recipeCategories.filter(
      (category) => !acc.some((item) => item.id === category.id)
    );

    if (newCategories.length) {
      acc.push(...newCategories);
    }

    return acc;
  }, [] as Array<Category>);

  // sort asc
  const sorted = dedupedCategories.sort((a, b) => {
    return a.name < b.name ? -1 : 1;
  });

  return sorted;
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
