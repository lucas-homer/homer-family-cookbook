import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { getProfile, updateNameFn } from "~/server/profile.functions";

// Legacy /profile dumped raw JSON; legacy /admin/profile let admins rename
// themselves. Both are folded in here: a readable summary plus a name form.
export const Route = createFileRoute("/profile")({
  loader: () => getProfile(),
  head: () => ({ meta: [{ title: "My Profile" }] }),
  component: Profile,
});

const inputClass = "rounded-lg bg-zinc-50 p-2";
const labelClass = "text-md mb-2 font-bold uppercase";

function Profile() {
  const { user, recipes, favorites, recentlyViewed } = Route.useLoaderData();
  const router = useRouter();
  const updateName = useServerFn(updateNameFn);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("saving");
    try {
      const result = await updateName({
        data: { firstName: String(form.get("firstName") ?? ""), lastName: String(form.get("lastName") ?? "") },
      });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors);
        setStatus("idle");
        return;
      }
      setFieldErrors({});
      await router.invalidate();
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-8 text-3xl font-bold md:mb-16">My Profile</h1>
      <p className="mb-8 text-zinc-600">
        {user.email}
        {user.role === "ADMIN" ? " · Admin" : ""}
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl">Name</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 md:max-w-sm" noValidate>
          <div className="flex flex-col">
            <label htmlFor="firstName" className={labelClass}>
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              maxLength={100}
              defaultValue={user.firstName}
              className={inputClass}
              aria-invalid={fieldErrors.firstName ? true : undefined}
              aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
            />
            {fieldErrors.firstName ? (
              <p className="text-red-600" role="alert" id="firstName-error">
                {fieldErrors.firstName}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col">
            <label htmlFor="lastName" className={labelClass}>
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              maxLength={100}
              defaultValue={user.lastName ?? ""}
              className={inputClass}
              aria-invalid={fieldErrors.lastName ? true : undefined}
              aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
            />
            {fieldErrors.lastName ? (
              <p className="text-red-600" role="alert" id="lastName-error">
                {fieldErrors.lastName}
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-4">
            <span role="status" className="text-zinc-600">
              {status === "saved" ? "Saved" : status === "failed" ? "Couldn’t save" : ""}
            </span>
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-lg bg-teal-700 px-4 py-2 font-semibold capitalize tracking-widest text-zinc-50 hover:bg-teal-800"
            >
              {status === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>

      <RecipeLinks title="My Recipes" empty="You haven't added any recipes yet." recipes={recipes} />
      <RecipeLinks title="Favorites" empty="No favorites yet." recipes={favorites} />
      <RecipeLinks title="Recently Viewed" empty="Nothing viewed yet." recipes={recentlyViewed} />
    </div>
  );
}

function RecipeLinks({ title, empty, recipes }: { title: string; empty: string; recipes: ReadonlyArray<{ id: string; title: string }> }) {
  return (
    <section className="mb-10">
      <h2 className="mb-2 text-2xl">{title}</h2>
      {recipes.length ? (
        <ul className="flex flex-col gap-1">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link to="/recipes/$recipeId" params={{ recipeId: recipe.id }} className="text-lg underline underline-offset-4">
                {recipe.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-500">{empty}</p>
      )}
    </section>
  );
}
