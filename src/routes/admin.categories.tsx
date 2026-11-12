import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";
import { groupTags, TAG_GROUPS } from "~/lib/tag-groups";
import { createCategoryFn, getAdminCategories, updateCategoryFn } from "~/server/categories-admin.functions";

export const Route = createFileRoute("/admin/categories")({
  loader: () => getAdminCategories(),
  head: () => ({ meta: [{ title: "Manage Tags" }] }),
  component: AdminTags,
});

const inputClass = "rounded-lg bg-zinc-50 p-2";
const labelClass = "text-md mb-2 font-bold uppercase";

type Tag = ReturnType<typeof Route.useLoaderData>[number];

function GroupSelect({ id, defaultValue }: { id: string; defaultValue: string }) {
  return (
    <select id={id} name="tagGroup" defaultValue={defaultValue} className={inputClass}>
      {TAG_GROUPS.map((group) => (
        <option key={group.id} value={group.id}>
          {group.label}
        </option>
      ))}
    </select>
  );
}

function AdminTags() {
  const tags = Route.useLoaderData();
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
        data: {
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? ""),
          tagGroup: String(form.get("tagGroup") ?? ""),
        },
      });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors);
        return;
      }
      setFieldErrors({});
      formRef.current?.reset();
      await router.invalidate();
    } catch {
      setFormError("Couldn’t create that tag.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-3xl">
      <h1 className="mb-12 text-3xl font-bold md:mb-24">Create Tag</h1>
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
            <label htmlFor="tagGroup" className={labelClass}>
              Group
            </label>
            <GroupSelect id="tagGroup" defaultValue="course" />
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

      <h2 className="mb-4 text-2xl">Existing tags</h2>
      <p className="mb-6 text-zinc-500">Rename a tag or move it to another group. Recipes keep their tags.</p>
      {groupTags(tags).map((group) => (
        <section key={group.id} className="mb-8">
          <h3 className="mb-2 font-bold uppercase">{group.label}</h3>
          <ul className="flex flex-col gap-2">
            {group.tags.map((tag) => (
              <TagRow key={tag.id} tag={tag} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

function TagRow({ tag }: { tag: Tag }) {
  const router = useRouter();
  const updateCategory = useServerFn(updateCategoryFn);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const result = await updateCategory({
        data: {
          categoryId: tag.id,
          name: String(form.get("name") ?? ""),
          description: tag.description ?? "",
          tagGroup: String(form.get("tagGroup") ?? ""),
        },
      });
      if (!result.ok) {
        setError(Object.values(result.fieldErrors)[0] ?? "Couldn’t save that tag.");
        return;
      }
      setEditing(false);
      await router.invalidate();
    } catch {
      setError("Couldn’t save that tag.");
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <li className="flex items-baseline gap-3">
        <span className="text-lg">{tag.name}</span>
        <span className="text-sm text-zinc-500">
          {tag.recipeCount} {tag.recipeCount === 1 ? "recipe" : "recipes"}
        </span>
        <button type="button" onClick={() => setEditing(true)} className="text-sm underline underline-offset-4">
          Edit
        </button>
      </li>
    );
  }
  return (
    <li>
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2" noValidate>
        <fieldset disabled={pending} className="contents">
          <label htmlFor={`name-${tag.id}`} className="sr-only">
            Name
          </label>
          <input id={`name-${tag.id}`} name="name" type="text" maxLength={60} defaultValue={tag.name} className={inputClass} />
          <label htmlFor={`group-${tag.id}`} className="sr-only">
            Group
          </label>
          <GroupSelect id={`group-${tag.id}`} defaultValue={tag.tagGroup} />
          <button type="submit" className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-zinc-50 hover:bg-teal-800">
            {pending ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-sm underline underline-offset-4">
            Cancel
          </button>
        </fieldset>
        {error ? (
          <p className="w-full text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </li>
  );
}
