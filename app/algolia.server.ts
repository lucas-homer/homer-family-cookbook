import { prisma } from "~/db.server";
import algoliasearch from "algoliasearch";
import { getAlgoliaIndexName } from "./utils";

async function getRecipesForAlgolia() {
  return prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      categories: {
        select: {
          name: true,
        },
      },
      ingredients: {
        select: {
          name: true,
        },
      },
    },
  });
}
function transformRecipeDataForAlgoliaIndex(
  recipes: Awaited<ReturnType<typeof getRecipesForAlgolia>>
) {
  return recipes.map((record) => {
    const { ingredients, categories, ...recipe } = record;
    return {
      objectID: recipe.id,
      ...recipe,
      ingredients: ingredients.map((item) => item.name),
      categories: categories.map((item) => item.name),
    };
  });
}

export async function updateAlgolia() {
  if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY) {
    throw new Error(
      `updateAlgolia fn missing env var(s): ALGOLIA_APP_ID: ${process.env.ALGOLIA_APP_ID} // ALGOLIA_API_KEY: ${process.env.ALGOLIA_API_KEY}`
    );
  }

  // fetch recipes and categories
  const recipes = await getRecipesForAlgolia();

  // transform data for algolia index
  const transformed = transformRecipeDataForAlgoliaIndex(recipes);

  // instantiate the algoliasearch client
  const searchClient = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_API_KEY
  );

  // init the index
  const index = searchClient.initIndex(getAlgoliaIndexName());

  // add objects to index
  await index.saveObjects(transformed);

  console.log("Algolia Index Updated ✅");
}
