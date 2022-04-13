import {
  Ingredient,
  Category,
  Recipe,
  User,
  UsersFavoriteRecipes,
} from "@prisma/client";
import { prisma } from "~/db.server";

export type GetRecipeResponse = Recipe & {
  categories: Category[];
  ingredients: Ingredient[];
  user: User;
  favoritedUsers: UsersFavoriteRecipes[];
};

export async function getRecipe(recipeId: Recipe["id"], userId?: User["id"]) {
  return prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      categories: true,
      ingredients: true,
      author: true,
      favoritedUsers: {
        where: {
          ...(userId && { userId }),
        },
      },
    },
  });
}

export async function getRecipesByCategory(categoryId: Category["id"]) {
  return prisma.recipe.findMany({
    where: {
      categories: {
        some: {
          id: categoryId,
        },
      },
    },
  });
}

export type UpdateRecipeParams = Partial<Recipe> & {
  categories: Array<Category["id"]>;
  ingredients: Array<{
    id?: Ingredient["id"];
    name: Ingredient["name"];
    quantity: Ingredient["quantity"];
  }>;
};

export async function updateRecipe(
  recipeId: Recipe["id"],
  updateParams: UpdateRecipeParams
) {
  const { categories, ingredients, ...recipe } = updateParams;

  // TODO -- this feels hacky...
  return prisma.$transaction([
    // reset ingredients
    prisma.ingredient.deleteMany({
      where: {
        recipeId,
      },
    }),
    // reset categories
    prisma.recipe.update({
      where: { id: recipeId },
      data: {
        categories: {
          set: [],
        },
      },
    }),

    // update recipe details and add new categories connections and ingredients
    prisma.recipe.update({
      where: { id: recipeId },
      data: {
        title: recipe.title,
        instructions: recipe.instructions,
        categories: {
          connect: categories?.map((id) => ({ id })),
        },
        ingredients: {
          createMany: {
            data: ingredients,
          },
        },
      },
    }),
  ]);
}

export async function favoriteRecipe({
  recipeId,
  userId,
}: {
  recipeId: Recipe["id"];
  userId: User["id"];
}) {
  return prisma.usersFavoriteRecipes.create({
    data: {
      recipeId,
      userId,
    },
  });
}

export async function unfavoriteRecipe({
  recipeId,
  userId,
}: {
  recipeId: Recipe["id"];
  userId: User["id"];
}) {
  return prisma.usersFavoriteRecipes.delete({
    where: {
      recipeId_userId: {
        userId,
        recipeId,
      },
    },
  });
}

// TODO -- maybe implement some sort of cleanup for 'expired' records
export async function recordRecipeView({
  recipeId,
  userId,
}: {
  recipeId: Recipe["id"];
  userId: User["id"];
}) {
  return prisma.recipeRead.upsert({
    where: {
      recipeId_userId: {
        recipeId,
        userId,
      },
    },
    update: {},
    create: {
      recipeId,
      userId,
    },
  });
}