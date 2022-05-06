import { useRef, useState } from "react";
import { Ingredient, Category, User } from "@prisma/client";
import queryString from "query-string";
import { v4 as uuidv4 } from "uuid";
import Dialog from "@reach/dialog";
import styles from "@reach/dialog/styles.css";
import {
  ActionFunction,
  LinksFunction,
  LoaderFunction,
  redirect,
} from "@remix-run/node";
import invariant from "tiny-invariant";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";

import { getCategories } from "~/models/category.server";
import {
  deleteRecipe,
  getRecipe,
  GetRecipeResponse,
  updateRecipe,
} from "~/models/recipe.server";
import { requireAuthorOrAdmin } from "~/session.server";
import { badRequest } from "~/errors.server";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import { updateAlgolia } from "~/algolia.server";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: styles,
    },
  ];
};

type LoaderData = {
  recipeData: GetRecipeResponse;
  categories: Category[];
  userId: User["id"] | null;
};
export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.recipeId, "recipeId not found");
  const recipeId = params.recipeId;
  await requireAuthorOrAdmin(request, recipeId);

  const recipeData = await getRecipe(recipeId);
  const categories = await getCategories();

  return {
    recipeData,
    categories,
  };
};

function validateRecipeTitle(title: string | undefined) {
  if (typeof title !== "string" || title.trim() === "") {
    return "Title required";
  }
}

function validateCategories(categories: string[]) {
  if (!categories?.length) {
    return "At least one category required";
  }
}

function validateIngredients(ingredients: Array<Record<string, unknown>>) {
  if (!ingredients.length) {
    return "This recipe needs at least ONE ingredient";
  }

  const areIngredientsInvalid = ingredients.some(
    (ingredient) => !ingredient?.name || typeof ingredient.name !== "string"
  );

  if (areIngredientsInvalid) {
    return "Each ingredient must have at least a name";
  }
}

function validateInstructions(instructions: string | undefined) {
  if (typeof instructions !== "string" || instructions.trim().length < 3) {
    return "At least three letters please :)";
  }
}

function prepIngredients(rawData: [string, string][]) {
  const ingredientsMap = rawData.reduce((acc, [key, value]) => {
    const startUuid = key.indexOf("[") + 1;
    const endUuid = key.indexOf("]");

    // put the value into the object at this index in acc
    const propertyUuid = key.slice(startUuid, endUuid);

    const propertyNameStart = key.lastIndexOf("[") + 1;
    const propertyNameEnd = key.lastIndexOf("]");
    const propertyName = key.slice(propertyNameStart, propertyNameEnd);

    // cast the value to correct type
    let propertyValue;
    switch (propertyName) {
      case "id":
        propertyValue = value;
        break;
      case "quantity":
        propertyValue = value ? value : null;
        break;
      case "name":
        propertyValue = value;
        break;
      default:
        throw new Error(`propertyName: ${propertyName} is INVALID`);
    }

    acc = {
      ...acc,
      [propertyUuid]: {
        ...acc[propertyUuid],
        [propertyName]: propertyValue,
      },
    };

    return acc;
  }, {} as Record<string, Record<string, unknown>>);
  const ingredients = Object.values(ingredientsMap);
  return ingredients;
}

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params.recipeId, "recipeId not found");
  const recipeId = params.recipeId;
  await requireAuthorOrAdmin(request, recipeId);

  /**
   * use `request.text()` for forms with structured data
   * https://remix.run/docs/en/v1/pages/faq#how-can-i-have-structured-data-in-a-form
   *  */
  let formQueryString = await request.text();
  let parsedForm = queryString.parse(formQueryString);
  const actionId = parsedForm.actionId as string;

  /** DELETE */
  if (actionId === "delete") {
    await deleteRecipe(recipeId);
    return redirect("/categories");
  }

  /** UPDATE */
  let title = parsedForm.title as string | undefined;
  let servings = parsedForm.servings as string | undefined;
  let background = parsedForm.background as string | undefined;
  let instructions = parsedForm.instructions as string | undefined;

  let ingredientsData = Object.entries(parsedForm).filter(([key]) =>
    key.startsWith("ingredient")
  ) as [string, string][];
  let ingredients = prepIngredients(ingredientsData) as Array<{
    id?: Ingredient["id"];
    name: Ingredient["name"];
    quantity: Ingredient["quantity"];
  }>;

  let categoriesData = parsedForm.categories as string | string[] | undefined;
  let categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData
    ? [categoriesData]
    : [];

  const fieldErrors = {
    title: validateRecipeTitle(title),
    instructions: validateInstructions(instructions),
    ingredients: validateIngredients(ingredients),
    categories: validateCategories(categories),
  };
  const fields = { title, instructions, categories, ingredients };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields });
  }

  await updateRecipe(recipeId, {
    title,
    servings,
    background,
    instructions,
    ingredients,
    categories,
  });

  await updateAlgolia();

  return redirect(`/recipes/${params.recipeId}`);
};

export default function EditRecipe() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const { recipeData, categories } = useLoaderData<LoaderData>();

  const onDismiss = () => {
    navigate(`/recipes/${recipeData.id}`);
  };

  const [ingredientsData, setIngredientsData] = useState(
    () => recipeData.ingredients
  );

  const newIngredientQuantityRef = useRef<HTMLInputElement>(null);
  const initialNewIngredient: Pick<Ingredient, "name" | "quantity"> = {
    name: "",
    quantity: "",
  };
  const [newIngredient, setNewIngredient] = useState(initialNewIngredient);
  const resetNewIngredient = () => setNewIngredient(initialNewIngredient);

  return (
    <Dialog
      isOpen={true}
      aria-label="Edit recipe"
      onDismiss={onDismiss}
      id="editRecipeModal"
      className="rounded-lg"
    >
      <div className="mb-6 flex items-center justify-between md:mb-24">
        <h3 className="text-2xl font-bold">Edit Recipe</h3>
        <fetcher.Form method="post">
          <input hidden name="actionId" value="delete" />
          <button
            type="submit"
            className="text-md rounded-lg border-2 border-red-500 px-2 py-1 font-semibold text-red-500"
          >
            Delete Recipe
          </button>
        </fetcher.Form>
      </div>
      <fetcher.Form method="post">
        <div className="flex flex-col flex-nowrap gap-8">
          <div className="flex  flex-col flex-nowrap">
            <input hidden name="actionId" value="update" />
            <label htmlFor="title" className="text-md mb-2 font-bold uppercase">
              Title
            </label>
            <input
              className="rounded-lg bg-zinc-50 p-2"
              type="text"
              name="title"
              defaultValue={recipeData.title}
              aria-invalid={
                Boolean(fetcher.data?.fieldErrors?.title) || undefined
              }
              aria-describedby={
                fetcher.data?.fieldErrors?.title ? "title-error" : undefined
              }
            />
            {fetcher.data?.fieldErrors?.title ? (
              <p className="text-red-600" role="alert" id="title-error">
                {fetcher.data?.fieldErrors.title}
              </p>
            ) : null}
          </div>
          <div className="flex w-full flex-col flex-nowrap ">
            <label
              htmlFor="servings"
              className="text-md mb-2 font-bold uppercase"
            >
              servings
            </label>
            <input
              className="rounded-lg bg-zinc-50 p-2"
              type="text"
              name="servings"
              id="servings"
              defaultValue={recipeData.servings ?? ""}
            />
          </div>

          <fieldset>
            <legend className="text-md mb-2 font-bold uppercase">
              Categories
            </legend>
            <ul className="grid  grid-flow-row grid-cols-2 rounded-lg bg-zinc-50 px-4 py-2">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-nowrap items-center gap-2 py-2"
                >
                  <input
                    id={`category-${category.name}`}
                    value={category.id}
                    type="checkbox"
                    name="categories"
                    defaultChecked={recipeData.categories.some(
                      (recipeCategory) => recipeCategory.id === category.id
                    )}
                  />
                  <label
                    className="capitalize"
                    htmlFor={`category-${category.name}`}
                  >
                    {category.name}
                  </label>
                </li>
              ))}
            </ul>
            {fetcher.data?.fieldErrors?.categories ? (
              <p className="text-red-600" role="alert" id="categories-error">
                {fetcher.data?.fieldErrors.categories}
              </p>
            ) : null}
          </fieldset>

          <fieldset>
            {fetcher.data?.fieldErrors?.ingredients ? (
              <p className="text-red-600" role="alert" id="ingredients-error">
                {fetcher.data?.fieldErrors.ingredients}
              </p>
            ) : null}
            <legend className="text-md mb-2 font-bold uppercase">
              Ingredients
            </legend>
            <ul className="grid grid-cols-1">
              <li className="mb-4 grid grid-cols-12 gap-px md:gap-2">
                <div className="col-span-4 col-start-1 flex flex-col flex-nowrap gap-1">
                  <label
                    className="text-sm"
                    htmlFor={`new-ingredient-quantity`}
                  >
                    Quantity
                  </label>
                  <input
                    ref={newIngredientQuantityRef}
                    type="text"
                    id={`new-ingredient-quantity`}
                    value={newIngredient.quantity ?? ""}
                    onChange={(e) =>
                      setNewIngredient((prevState) => ({
                        ...prevState,
                        quantity: e.target.value,
                      }))
                    }
                    className="mr-2 rounded-lg bg-zinc-50 p-2"
                  />
                </div>
                <div className="col-span-7 flex flex-col flex-nowrap gap-1">
                  <label className="text-sm" htmlFor={`new-ingredient-name`}>
                    Name
                  </label>{" "}
                  <input
                    type="text"
                    id={`new-ingredient-name`}
                    className="rounded-lg bg-zinc-50 p-2"
                    value={newIngredient.name}
                    onChange={(e) =>
                      setNewIngredient((prevState) => ({
                        ...prevState,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <button
                  onClick={() => {
                    setIngredientsData((prevState) => [
                      ...prevState,
                      newIngredient as Ingredient,
                    ]);
                    resetNewIngredient();
                    newIngredientQuantityRef.current &&
                      newIngredientQuantityRef.current?.focus();
                  }}
                  type="button"
                  title="add ingredient"
                  className="col-end-13 flex justify-center self-end rounded-lg p-2 text-emerald-500 hover:bg-zinc-50 disabled:bg-inherit disabled:text-zinc-500"
                >
                  <div
                    className="flex justify-center"
                    style={{ height: "24px", width: "24px" }}
                  >
                    <CheckIcon width={24} height={24} />
                  </div>
                </button>
              </li>
              <hr />
              {ingredientsData.map((ingredient) => {
                const uuid = uuidv4();
                return (
                  <li
                    key={ingredient.id ?? uuid}
                    className="grid grid-cols-12 gap-px md:gap-2"
                  >
                    <input
                      hidden
                      name={`ingredient[${uuid}][id]`}
                      value={ingredient.id ?? undefined} // we specifically do NOT coalesce to `uuid` here to (downstream) differentiate update vs create
                    />
                    <div className="col-span-4 col-start-1 flex flex-col flex-nowrap gap-1">
                      <label
                        htmlFor={`ingredient[${uuid}][quantity]`}
                        className="text-xs text-white"
                      >
                        Quantity
                      </label>
                      <input
                        type="text"
                        name={`ingredient[${uuid}][quantity]`}
                        defaultValue={ingredient.quantity ?? ""}
                        className="mr-2 rounded-lg bg-zinc-50 p-2"
                      />
                    </div>
                    <div className="col-span-7 flex flex-col flex-nowrap gap-1">
                      <label
                        htmlFor={`ingredient[${uuid}][name]`}
                        className="text-xs text-white"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        name={`ingredient[${uuid}][name]`}
                        defaultValue={ingredient.name}
                        className="  rounded-lg bg-zinc-50 p-2"
                      />
                    </div>
                    <button
                      onClick={() =>
                        setIngredientsData((prevState) => {
                          return prevState.filter((item) => {
                            return (
                              item.name !== ingredient.name &&
                              item.quantity !== ingredient.quantity
                            );
                          });
                        })
                      }
                      type="button"
                      title="remove ingredient"
                      className="col-end-13 flex justify-center self-end rounded-lg p-2 text-red-500  hover:bg-zinc-50 disabled:bg-inherit"
                    >
                      <div
                        className="flex justify-center"
                        style={{ height: "24px", width: "24px" }}
                      >
                        <Cross2Icon width={24} height={24} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <div className="flex flex-col">
            <label
              htmlFor="background"
              className="text-md mb-2 font-bold uppercase"
            >
              Background
            </label>
            <textarea
              className="mb-4 h-44 w-full rounded-lg bg-zinc-50 p-4 "
              id="background"
              name="background"
              placeholder="Sometimes a recipe has a good story :)"
              defaultValue={recipeData.background ?? ""}
            />
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="instructions"
              className="text-md mb-2 font-bold uppercase"
            >
              Instructions
            </label>
            <textarea
              className="mb-4 h-96 w-full whitespace-pre-line rounded-lg bg-zinc-50 p-4"
              id="instructions"
              name="instructions"
              defaultValue={recipeData.instructions}
              aria-invalid={
                Boolean(fetcher.data?.fieldErrors?.instructions) || undefined
              }
              aria-describedby={
                fetcher.data?.fieldErrors?.instructions
                  ? "instructions-error"
                  : undefined
              }
            />
            {fetcher.data?.fieldErrors?.instructions ? (
              <p className="text-red-600" role="alert" id="instructions-error">
                {fetcher.data?.fieldErrors.instructions}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onDismiss}
            className=" p-2 font-semibold capitalize tracking-wider text-zinc-700"
          >
            cancel
          </button>
          <button
            className="rounded-lg bg-teal-700 px-4 py-2 font-semibold capitalize tracking-widest text-zinc-50 hover:bg-teal-800"
            type="submit"
          >
            Save
          </button>
        </div>
      </fetcher.Form>
    </Dialog>
  );
}
