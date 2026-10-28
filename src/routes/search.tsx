import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { RecipeSummary } from "~/components/recipe/recipe-summary";
import { getSearchResults } from "~/server/recipes/read";
export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q.slice(0, 500) : "",
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => getSearchResults({ data: { q: deps.q } }),
  head: () => ({
    meta: [
      { title: "Search recipes | Homer Family Cookbook" },
      {
        name: "description",
        content:
          "Search family recipes by title, ingredients, instructions, and background",
      },
    ],
  }),
  component: Search,
});
function Search() {
  const results = Route.useLoaderData();
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    // Sync for back/forward, but never while the user is typing.
    if (input.current && document.activeElement !== input.current) input.current.value = q;
  }, [q]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <section className="max-w-2xl">
      <h1 className="mb-6 text-3xl">Search recipes</h1>
      <form
        action="/search"
        method="get"
        className="mb-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          clearTimeout(timer.current);
          void navigate({ search: { q: input.current?.value ?? "" } });
        }}
      >
        <label htmlFor="recipe-search" className="sr-only">
          Search recipes
        </label>
        <input
          ref={input}
          id="recipe-search"
          name="q"
          type="search"
          maxLength={500}
          defaultValue={q}
          placeholder="Search recipes or ingredients"
          className="min-w-0 flex-1 rounded-md border border-zinc-400 px-3 py-2 text-lg"
          onChange={(event) => {
            const value = event.currentTarget.value;
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              void navigate({ search: { q: value }, replace: true });
            }, 250);
          }}
        />
        <button className="rounded-md bg-teal-700 px-4 py-2 text-white">
          Search
        </button>
      </form>
      <p role="status" className="mb-4 text-zinc-500">
        {q.trim()
          ? `${results.length}${results.length === 50 ? "+" : ""} recipes found`
          : "Search by title, ingredient, instructions, or background."}
      </p>
      <ul>
        {results.map((recipe) => (
          <li key={recipe.id} className="mb-4">
            <RecipeSummary recipe={recipe} />
            <p className="max-w-lg px-3 text-zinc-500">{recipe.snippet}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
