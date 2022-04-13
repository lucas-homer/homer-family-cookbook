import { useRef, useState } from "react";
import { Ingredient, Category, User } from "@prisma/client";
import queryString from "query-string";
import Dialog from "@reach/dialog";
import styles from "@reach/dialog/styles.css";
import {
  ActionFunction,
  LinksFunction,
  LoaderFunction,
  redirect,
} from "@remix-run/node";
import invariant from "tiny-invariant";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";

import { getCategories } from "~/models/category.server";
import {
  getRecipe,
  GetRecipeResponse,
  updateRecipe,
} from "~/models/recipe.server";
import { requireUserId } from "~/session.server";
import { badRequest } from "~/errors.server";

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
  await requireUserId(request);

  const recipeId = params.recipeId;
  const recipeData = await getRecipe(recipeId);
  const categories = await getCategories();

  return {
    recipeData,
    categories,
  };
};

type ActionData = {
  formError?: string;
  fieldErrors?: {
    title: string | undefined;
    instructions: string | undefined;
    ingredients: string | undefined;
    categories: string | undefined;
  };
  fields?: {
    title: string;
    instructions: string;
    ingredients: string;
    categories: string;
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
  const ingredients = rawData.reduce((acc, [key, value]) => {
    const startIndex = key.indexOf("[") + 1;
    const endIndex = key.indexOf("]");

    // put the value into the object at this index in acc
    const propertyIndex = Number(key.slice(startIndex, endIndex));

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

    // if acc doesn't have an item at that index, we add an object with the propertyName: value entry inside
    if (!acc[propertyIndex]) {
      acc = [...acc, { [propertyName]: propertyValue }];
      return acc;
    }

    // acc has an item at the index but that item doesn't have a property name
    if (!acc[propertyIndex][propertyName]) {
      acc[propertyIndex] = {
        ...acc[propertyIndex],
        [propertyName]: propertyValue,
      };
      return acc;
    }
    return acc;
  }, [] as Array<Record<string, unknown>>);

  return ingredients;
}

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params.recipeId, "recipeId not found");
  await requireUserId(request);
  const recipeId = params.recipeId;

  // use `request.text()`, not `request.formData` to get the form data as a url
  // encoded form query string
  let formQueryString = await request.text();

  // parse it into an object
  let form = queryString.parse(formQueryString);
  let title = form.title as string | undefined;
  let instructions = form.instructions as string | undefined;

  let ingredientsData = Object.entries(form).filter(([key]) =>
    key.startsWith("ingredient")
  ) as [string, string][];
  let ingredients = prepIngredients(ingredientsData) as Array<{
    id?: Ingredient["id"];
    name: Ingredient["name"];
    quantity: Ingredient["quantity"];
  }>;

  let categoriesData = form.categories as string | string[] | undefined;
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

  console.log("PASSED VALIDATION");

  await updateRecipe(recipeId, {
    title,
    instructions,
    ingredients,
    categories,
  });

  return redirect(`/recipes/${params.recipeId}`);
};

export default function EditRecipe() {
  const { recipeData, categories } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const actionData = useActionData<ActionData>();

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
    <Dialog isOpen={true} aria-label="Edit recipe" onDismiss={onDismiss}>
      <h3 className="mb-6 text-3xl">Edit Recipe</h3>
      <Form method="post">
        <div className="flex flex-col flex-nowrap gap-4">
          <div className="flex flex-col flex-nowrap">
            <label htmlFor="title" className="text-xl">
              Title
            </label>
            <input
              className="border border-solid border-black p-2"
              type="text"
              name="title"
              defaultValue={recipeData.title}
              aria-invalid={
                Boolean(actionData?.fieldErrors?.title) || undefined
              }
              aria-describedby={
                actionData?.fieldErrors?.title ? "title-error" : undefined
              }
            />
            {actionData?.fieldErrors?.title ? (
              <p className="text-red-600" role="alert" id="title-error">
                {actionData?.fieldErrors.title}
              </p>
            ) : null}
          </div>
          <fieldset>
            <legend className="text-xl">Categories</legend>
            <ul className="grid grid-flow-row grid-cols-2">
              {categories.map((mealType) => (
                <li key={mealType.id}>
                  <label>
                    <input
                      type="checkbox"
                      name="categories"
                      value={mealType.id}
                      defaultChecked={recipeData.categories.some(
                        (recipeCategory) => recipeCategory.id === mealType.id
                      )}
                    />
                    {mealType.name}
                  </label>
                </li>
              ))}
            </ul>
            {actionData?.fieldErrors?.categories ? (
              <p className="text-red-600" role="alert" id="categories-error">
                {actionData?.fieldErrors.categories}
              </p>
            ) : null}
          </fieldset>

          <fieldset>
            {actionData?.fieldErrors?.ingredients ? (
              <p className="text-red-600" role="alert" id="ingredients-error">
                {actionData?.fieldErrors.ingredients}
              </p>
            ) : null}
            <legend className="mb-2 text-xl">Ingredients</legend>
            <ul className="grid grid-cols-1">
              <li className="flex flex-nowrap gap-2 border-b-2 border-black py-4">
                <div className="flex flex-col flex-nowrap">
                  <label htmlFor={`new-ingredient-quantity`}>quantity</label>
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
                    className="mr-2 border border-solid border-black p-2"
                  />
                </div>
                <div className="flex flex-col flex-nowrap">
                  <label htmlFor={`new-ingredient-name`}>name</label>
                  <input
                    type="text"
                    id={`new-ingredient-name`}
                    className="border border-solid border-black p-2"
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
                >
                  ➕
                </button>
              </li>
              {ingredientsData.map((ingredient, index) => (
                <li
                  key={ingredient.id ?? new Date()}
                  className="flex flex-nowrap gap-2 border-b-2 border-black py-4"
                >
                  <input
                    hidden
                    name={`ingredient[${index}][id]`}
                    value={ingredient.id ?? undefined}
                  />
                  <div className="flex flex-col flex-nowrap">
                    <label htmlFor={`ingredient[${index}][quantity]`}>
                      quantity
                    </label>
                    <input
                      type="text"
                      name={`ingredient[${index}][quantity]`}
                      defaultValue={ingredient.quantity ?? ""}
                      className="mr-2 border border-solid border-black p-2"
                    />
                  </div>
                  <div className="flex flex-col flex-nowrap">
                    <label htmlFor={`ingredient[${index}][name]`}>name</label>
                    <input
                      type="text"
                      name={`ingredient[${index}][name]`}
                      defaultValue={ingredient.name}
                      className="border border-solid border-black p-2"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setIngredientsData((prevState) =>
                        prevState.filter((item) => item.id !== ingredient.id)
                      )
                    }
                    type="button"
                    title="remove ingredient"
                  >
                    ❌
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="flex flex-col">
            <label htmlFor="instructions" className="text-xl">
              Instructions:
            </label>
            <textarea
              className="mb-4 h-96 w-full border border-solid border-black "
              id="instructions"
              name="instructions"
              defaultValue={recipeData.instructions}
              aria-invalid={
                Boolean(actionData?.fieldErrors?.instructions) || undefined
              }
              aria-describedby={
                actionData?.fieldErrors?.instructions
                  ? "instructions-error"
                  : undefined
              }
            />
            {actionData?.fieldErrors?.instructions ? (
              <p className="text-red-600" role="alert" id="instructions-error">
                {actionData?.fieldErrors.instructions}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onDismiss}
            className="border border-solid border-gray-300 p-1"
          >
            cancel
          </button>
          <button
            className="border border-solid border-gray-600 p-1 font-semibold"
            type="submit"
          >
            Save
          </button>
        </div>
      </Form>
    </Dialog>
  );
}
