import { ChangeEvent, useRef, useState } from "react";
import { Ingredient, Category } from "@prisma/client";
import queryString from "query-string";
import { v4 as uuidv4 } from "uuid";
import styles from "@reach/dialog/styles.css";
import {
  ActionFunction,
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  redirect,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";

import { getCategories } from "~/models/category.server";
import { createRecipe } from "~/models/recipe.server";
import { requireUserId } from "~/session.server";
import { badRequest } from "~/errors.server";
import { updateAlgolia } from "~/algolia.server";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: styles,
    },
  ];
};

export const meta: MetaFunction = () => {
  return {
    title: `Create Recipe`,
    description: `Add a recipe to the Homer Family Cookbook`,
  };
};

type LoaderData = {
  categories: Category[];
};
export const loader: LoaderFunction = async ({ params, request }) => {
  await requireUserId(request);

  const categories = await getCategories();

  return {
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
  const userId = await requireUserId(request);

  // use `request.text()`, not `request.formData` to get the form data as a url
  // encoded form query string
  let formQueryString = await request.text();

  // parse it into an object
  let form = queryString.parse(formQueryString);
  let title = form.title as string;
  let servings = form.servings as string;
  let background = form.background as string;
  let instructions = form.instructions as string;

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

  const newRecipe = await createRecipe(userId, {
    title,
    servings,
    background,
    instructions,
    ingredients,
    categories,
  });

  await updateAlgolia();

  return redirect(`/recipes/${newRecipe.id}`);
};

type NewIngredient = Pick<Ingredient, "name" | "quantity"> & { key: string };
export default function CreateRecipe() {
  const { categories } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigate = useNavigate();

  const newIngredientQuantityRef = useRef<HTMLInputElement>(null);
  const initialNewIngredient: NewIngredient = {
    name: "",
    quantity: "",
    key: uuidv4(),
  };
  const [newIngredient, setNewIngredient] = useState(initialNewIngredient);
  const resetNewIngredient = () => setNewIngredient(initialNewIngredient);

  const [ingredientsData, setIngredientsData] = useState<Array<NewIngredient>>(
    []
  );

  const removeIngredient = (key: string) => {
    setIngredientsData((prevState) =>
      prevState.filter((item) => item.key !== key)
    );
  };
  const handleIngredientInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    field: "name" | "quantity",
    key: string
  ) => {
    setIngredientsData((prevState) => {
      return prevState.map((ingredient) => {
        if (ingredient.key !== key) {
          return ingredient;
        }

        return {
          ...ingredient,
          [field]: event.target.value,
        };
      });
    });
  };

  return (
    <section>
      <h3 className="mb-12 text-3xl font-bold md:mb-24">Create Recipe</h3>
      <Form method="post">
        <div className="flex flex-col flex-nowrap gap-8">
          <div className="flex w-full flex-col flex-nowrap md:max-w-sm">
            <label htmlFor="title" className="text-md mb-2 font-bold uppercase">
              Title
            </label>
            <input
              className="rounded-lg bg-zinc-50 p-2"
              type="text"
              name="title"
              defaultValue={actionData?.fields?.title ?? ""}
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
          <div className="flex w-full flex-col flex-nowrap md:max-w-sm">
            <label htmlFor="title" className="text-md mb-2 font-bold uppercase">
              servings
            </label>
            <input
              className="rounded-lg bg-zinc-50 p-2"
              type="text"
              name="servings"
              id="servings"
            />
          </div>
          <fieldset>
            <legend className="text-md mb-2 font-bold uppercase">
              Categories
            </legend>
            <ul className="grid max-w-sm grid-flow-row grid-cols-2 rounded-lg bg-zinc-50 px-4 py-2">
              {categories.map((category) => (
                <li key={category.id} className="py-2">
                  <input
                    id={`category-${category.name}`}
                    type="checkbox"
                    name="categories"
                    value={category.id}
                    className="bg-zinc-0 mr-2 accent-teal-700"
                  />
                  <label htmlFor={`category-${category.name}`}>
                    {category.name}
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
            <legend className="text-md mb-2 font-bold uppercase">
              Ingredients
            </legend>
            <ul className="grid max-w-lg grid-cols-1">
              <li className="grid grid-cols-12 gap-px md:gap-2">
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
                    placeholder="2 cups"
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
                  </label>
                  <input
                    type="text"
                    placeholder="all purpose flour"
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
                      newIngredient,
                    ]);
                    resetNewIngredient();
                    newIngredientQuantityRef.current &&
                      newIngredientQuantityRef.current?.focus();
                  }}
                  type="button"
                  disabled={!newIngredient.name}
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
              {ingredientsData.map((ingredient) => {
                const { key } = ingredient;
                return (
                  <li key={key} className="grid grid-cols-12 gap-2">
                    <div className="col-span-4 col-start-1 flex flex-col flex-nowrap gap-1">
                      <label
                        htmlFor={`ingredient[${key}][quantity]`}
                        className="text-xs text-white"
                      >
                        Quantity
                      </label>
                      <input
                        type="text"
                        name={`ingredient[${key}][quantity]`}
                        value={ingredient.quantity ?? ""}
                        className="mr-2 rounded-lg bg-zinc-50 p-2"
                        onChange={(e) =>
                          handleIngredientInputChange(e, "quantity", key)
                        }
                      />
                    </div>
                    <div className="col-span-7 flex flex-col flex-nowrap gap-1">
                      <label
                        htmlFor={`ingredient[${key}][name]`}
                        className="text-xs text-white"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        name={`ingredient[${key}][name]`}
                        value={ingredient.name}
                        className="rounded-lg bg-zinc-50 p-2"
                        onChange={(e) =>
                          handleIngredientInputChange(e, "name", key)
                        }
                      />
                    </div>
                    <button
                      onClick={() => removeIngredient(key)}
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
              className="mb-4 h-44 w-full rounded-lg bg-zinc-50 p-4 md:max-w-lg"
              id="background"
              name="background"
              placeholder="Sometimes a recipe has a good story :)"
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
              className="mb-4 h-96 w-full rounded-lg bg-zinc-50 p-4 md:max-w-lg"
              id="instructions"
              name="instructions"
              defaultValue={actionData?.fields?.instructions ?? ""}
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
        <div className="flex max-w-lg justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className=" p-2 font-semibold capitalize tracking-wider text-zinc-700"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-teal-700 px-4 py-2 font-semibold capitalize tracking-widest text-zinc-50 hover:bg-teal-800"
            type="submit"
          >
            Save
          </button>
        </div>
      </Form>
    </section>
  );
}
