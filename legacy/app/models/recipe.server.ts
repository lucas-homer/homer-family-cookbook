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

export async function getRecipesByCategory(
  categoryId: Category["id"],
  sort?: "asc" | "desc"
) {
  return prisma.recipe.findMany({
    where: {
      categories: {
        some: {
          id: categoryId,
        },
      },
    },
    orderBy: [{ title: sort ?? "asc" }],
    include: {
      author: true,
    },
  });
}

export async function getFavoriteRecipesByCategory(
  userId: User["id"],
  categoryId: Category["id"] | null,
  sort?: "asc" | "desc"
) {
  return prisma.recipe.findMany({
    where: {
      categories: {
        some: {
          ...(categoryId && { id: categoryId }),
        },
      },
      favoritedUsers: {
        some: {
          userId,
        },
      },
    },
    orderBy: [{ title: sort ?? "asc" }],
    include: {
      author: true,
    },
  });
}

export type CreateRecipeParams = {
  title: Recipe["title"];
  instructions: Recipe["instructions"];
  servings?: Recipe["servings"];
  background?: Recipe["background"];
  categories: Array<Category["id"]>;
  ingredients: Array<{
    id?: Ingredient["id"];
    name: Ingredient["name"];
    quantity: Ingredient["quantity"];
  }>;
};
export async function createRecipe(
  userId: User["id"],
  params: CreateRecipeParams
) {
  return prisma.recipe.create({
    data: {
      author: {
        connect: { id: userId },
      },
      title: params.title,
      instructions: params.instructions,
      ...(params.background && { background: params.background }),
      ...(params.servings && { servings: params.servings }),
      categories: {
        connect: params.categories.map((category) => ({ id: category })),
      },
      ingredients: {
        createMany: {
          data: params.ingredients,
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
      include: {
        categories: true,
      },
    }),

    // update recipe details and add new categories connections and ingredients
    prisma.recipe.update({
      where: { id: recipeId },
      data: {
        title: recipe.title,
        instructions: recipe.instructions,
        ...(recipe.background && { background: recipe.background }),
        ...(recipe.servings && { servings: recipe.servings }),
        categories: {
          connect: categories?.map((id) => ({ id })),
        },
        ingredients: {
          createMany: {
            data: ingredients.map((item) => ({
              name: item.name,
              ...(item.quantity && { quantity: item.quantity }),
            })),
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
    update: {
      updatedAt: new Date(),
    },
    create: {
      recipeId,
      userId,
    },
  });
}

export async function deleteRecipe(recipeId: Recipe["id"]) {
  return prisma.recipe.delete({
    where: { id: recipeId },
  });
}
