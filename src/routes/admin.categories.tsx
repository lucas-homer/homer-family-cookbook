import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";
import { createCategoryFn, getAdminCategories } from "~/server/categories-admin.functions";

export const Route = createFileRoute("/admin/categories")({
  loader: () => getAdminCategories(),
  head: () => ({ meta: [{ title: "Manage Categories" }] }),
  component: AdminCategories,
});

const inputClass = "rounded-lg bg-zinc-50 p-2";
const labelClass = "text-md mb-2 font-bold uppercase";

function AdminCategories() {
  const categories = Route.useLoaderData();
  const router = useRouter();
  const createCategory = useServerFn(createCategoryFn);
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setFormError(null);
    try {
      const result = await createCategory({
        data: { name: String(form.get("name") ?? ""), description: String(form.get("description") ?? "") },
      });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors);
        return;
      }
      setFieldErrors({});
      formRef.current?.reset();
      await router.invalidate();
    } catch {
      setFormError("Couldn’t create that category.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-3xl">
      <h1 className="mb-12 text-3xl font-bold md:mb-24">Create Category</h1>
      <form ref={formRef} onSubmit={onSubmit} className="mb-16 flex flex-col gap-4" noValidate>
        <fieldset disabled={pending} className="flex w-full flex-col flex-nowrap gap-4 md:max-w-sm">
          <div className="flex flex-col">
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              maxLength={60}
              className={inputClass}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
            />
            {fieldErrors.name ? (
              <p className="text-red-600" role="alert" id="name-error">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col">
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <input id="description" name="description" type="text" maxLength={500} className={inputClass} />
          </div>
          {formError ? (
            <p className="text-red-600" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 font-semibold capitalize tracking-widest text-zinc-50 hover:bg-teal-800"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        </fieldset>
      </form>

      <h2 className="mb-4 text-2xl">Existing categories</h2>
      <ul className="flex flex-col gap-2">
        {categories.map((category) => (
          <li key={category.id} className="flex items-baseline gap-2">
            <span className="text-lg capitalize">{category.name}</span>
            <span className="text-sm text-zinc-500">
              {category.recipeCount} {category.recipeCount === 1 ? "recipe" : "recipes"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
