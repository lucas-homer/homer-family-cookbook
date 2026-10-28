import { useState, type FormEvent } from "react";
import type { FormResult } from "~/server/input";
import type { RecipeInput } from "~/server/recipes/write";

// Shared by /recipes/new and /recipes/$recipeId/edit. The server validates
// everything again; client checks here are only for quick feedback.

const MAX_INGREDIENTS = 100;

export interface RecipeFormValues {
  readonly title: string;
  readonly servings: string | null;
  readonly background: string | null;
  readonly instructions: string;
  readonly categoryIds: ReadonlyArray<string>;
  readonly ingredients: ReadonlyArray<{ readonly name: string; readonly quantity: string | null }>;
}

interface Row {
  readonly key: string;
  name: string;
  quantity: string;
}

let nextKey = 0;
const makeRow = (name = "", quantity = ""): Row => ({ key: `row-${nextKey++}`, name, quantity });

const inputClass = "rounded-lg bg-zinc-50 p-2";
const labelClass = "text-md mb-2 font-bold uppercase";

export function RecipeForm({
  categories,
  initial,
  onSubmit,
  onCancel,
}: {
  categories: ReadonlyArray<{ id: string; name: string }>;
  initial?: RecipeFormValues;
  onSubmit: (values: RecipeInput) => Promise<FormResult<{ id: string }>>;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Array<Row>>(() =>
    initial?.ingredients.length
      ? initial.ingredients.map((i) => makeRow(i.name, i.quantity ?? ""))
      : [makeRow()],
  );
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const updateRow = (key: string, patch: Partial<Pick<Row, "name" | "quantity">>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removeRow = (key: string) => setRows((current) => current.filter((row) => row.key !== key));
  const moveRow = (index: number, by: -1 | 1) =>
    setRows((current) => {
      const target = index + by;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: RecipeInput = {
      title: String(form.get("title") ?? ""),
      servings: String(form.get("servings") ?? ""),
      background: String(form.get("background") ?? ""),
      instructions: String(form.get("instructions") ?? ""),
      categoryIds: form.getAll("categoryIds").map(String),
      // Fully blank rows are dropped; a quantity without a name is kept so the server can flag it.
      ingredients: rows
        .filter((row) => row.name.trim() || row.quantity.trim())
        .map((row) => ({ name: row.name, quantity: row.quantity })),
    };
    setPending(true);
    setFormError(null);
    try {
      const result = await onSubmit(values);
      if (!result.ok) setFieldErrors(result.fieldErrors);
    } catch {
      setFormError("Something went wrong saving this recipe. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const errorProps = (field: string) =>
    fieldErrors[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};
  const errorText = (field: string) =>
    fieldErrors[field] ? (
      <p className="text-red-600" role="alert" id={`${field}-error`}>
        {fieldErrors[field]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset disabled={pending} className="flex flex-col flex-nowrap gap-8">
        <div className="flex flex-col flex-nowrap">
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <input id="title" name="title" type="text" maxLength={200} defaultValue={initial?.title ?? ""} className={inputClass} {...errorProps("title")} />
          {errorText("title")}
        </div>

        <div className="flex w-full flex-col flex-nowrap">
          <label htmlFor="servings" className={labelClass}>
            servings
          </label>
          <input id="servings" name="servings" type="text" maxLength={100} defaultValue={initial?.servings ?? ""} className={inputClass} {...errorProps("servings")} />
          {errorText("servings")}
        </div>

        <fieldset>
          <legend className={labelClass}>Categories</legend>
          <ul className="grid grid-flow-row grid-cols-2 rounded-lg bg-zinc-50 px-4 py-2">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-nowrap items-center gap-2 py-2">
                <input
                  id={`category-${category.id}`}
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  defaultChecked={initial?.categoryIds.includes(category.id)}
                />
                <label className="capitalize" htmlFor={`category-${category.id}`}>
                  {category.name}
                </label>
              </li>
            ))}
          </ul>
          {errorText("categoryIds")}
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Ingredients</legend>
          {errorText("ingredients")}
          <ol className="grid grid-cols-1 gap-2">
            {rows.map((row, index) => (
              <li key={row.key} className="grid grid-cols-12 items-end gap-px md:gap-2">
                <div className="col-span-4 flex flex-col flex-nowrap gap-1">
                  <label htmlFor={`${row.key}-quantity`} className={index === 0 ? "text-sm" : "sr-only"}>
                    Quantity
                  </label>
                  <input
                    id={`${row.key}-quantity`}
                    type="text"
                    maxLength={100}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    className={`mr-2 ${inputClass}`}
                  />
                </div>
                <div className="col-span-5 flex flex-col flex-nowrap gap-1">
                  <label htmlFor={`${row.key}-name`} className={index === 0 ? "text-sm" : "sr-only"}>
                    Name
                  </label>
                  <input
                    id={`${row.key}-name`}
                    type="text"
                    maxLength={200}
                    value={row.name}
                    onChange={(e) => updateRow(row.key, { name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-3 flex justify-end gap-1">
                  <IconButton label={`Move ingredient ${index + 1} up`} disabled={index === 0} onClick={() => moveRow(index, -1)}>
                    ↑
                  </IconButton>
                  <IconButton label={`Move ingredient ${index + 1} down`} disabled={index === rows.length - 1} onClick={() => moveRow(index, 1)}>
                    ↓
                  </IconButton>
                  <IconButton label={`Remove ingredient ${index + 1}`} className="text-red-500" onClick={() => removeRow(row.key)}>
                    ✕
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            disabled={rows.length >= MAX_INGREDIENTS}
            onClick={() => setRows((current) => [...current, makeRow()])}
            className="mt-3 rounded-lg px-2 py-1 font-semibold text-emerald-600 hover:bg-zinc-50 disabled:text-zinc-400"
          >
            + Add ingredient
          </button>
        </fieldset>

        <div className="flex flex-col">
          <label htmlFor="background" className={labelClass}>
            Background
          </label>
          <textarea
            id="background"
            name="background"
            maxLength={10_000}
            placeholder="Sometimes a recipe has a good story :)"
            defaultValue={initial?.background ?? ""}
            className="mb-4 h-44 w-full rounded-lg bg-zinc-50 p-4"
            {...errorProps("background")}
          />
          {errorText("background")}
        </div>

        <div className="flex flex-col">
          <label htmlFor="instructions" className={labelClass}>
            Instructions
          </label>
          <textarea
            id="instructions"
            name="instructions"
            maxLength={50_000}
            defaultValue={initial?.instructions ?? ""}
            className="mb-4 h-96 w-full whitespace-pre-line rounded-lg bg-zinc-50 p-4"
            {...errorProps("instructions")}
          />
          {errorText("instructions")}
        </div>

        {formError ? (
          <p className="text-red-600" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flex justify-end gap-4">
          <button type="button" onClick={onCancel} className="p-2 font-semibold capitalize tracking-wider text-zinc-700">
            cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 font-semibold capitalize tracking-widest text-zinc-50 hover:bg-teal-800"
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function IconButton({
  label,
  className = "",
  disabled,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg hover:bg-zinc-50 disabled:text-zinc-300 ${className}`}
    >
      {children}
    </button>
  );
}
