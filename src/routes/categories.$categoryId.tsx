import { createFileRoute, Link } from "@tanstack/react-router";
import { groupTags, tagGroupLabel } from "~/lib/tag-groups";
import { getCategory, MAX_COMBINED_TAGS } from "~/server/categories/read";
import { RecipeSummary } from "~/components/recipe/recipe-summary";

type TagSearch = { sort: "asc" | "desc"; with?: string[] };

export const Route = createFileRoute("/categories/$categoryId")({
  validateSearch: (search: Record<string, unknown>): TagSearch => {
    const extra = Array.isArray(search.with)
      ? search.with.filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, MAX_COMBINED_TAGS - 1)
      : [];
    return { sort: search.sort === "desc" ? "desc" : "asc", ...(extra.length ? { with: extra } : {}) };
  },
  loaderDeps: ({ search }) => ({ sort: search.sort, with: search.with }),
  loader: ({ params, deps }) =>
    getCategory({ data: { categoryId: params.categoryId, sort: deps.sort, with: deps.with } }),
  head: ({ loaderData }) => {
    const names = loaderData ? [loaderData.category, ...loaderData.selected].map((tag) => tag.name).join(" + ") : "Not found";
    return {
      meta: [
        { title: `Recipes tagged ${names}` },
        { name: "description", content: `Recipes tagged ${names}` },
      ],
    };
  },
  component: Tag,
});

const chip = "inline-block rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-200";

function Tag() {
  const { category, selected, recipes, related } = Route.useLoaderData();
  const { sort } = Route.useSearch();
  const withIds = selected.map((tag) => tag.id);
  const canNarrow = withIds.length < MAX_COMBINED_TAGS - 1;
  const search = (ids: string[], nextSort = sort): TagSearch => ({ sort: nextSort, ...(ids.length ? { with: ids } : {}) });
  return (
    <div>
      <Link to="/categories" className="mb-4 inline-block text-zinc-500 underline-offset-4 hover:underline">
        ← All tags
      </Link>
      <p className="text-sm font-bold uppercase text-zinc-400">{tagGroupLabel(category.tagGroup)}</p>
      <h1 className="mb-3 text-2xl">{category.name}</h1>
      {selected.length > 0 && (
        <ul className="mb-4 flex flex-wrap items-center gap-2">
          <li className="text-zinc-500">and</li>
          {selected.map((tag) => (
            <li key={tag.id}>
              <Link
                to="/categories/$categoryId"
                params={{ categoryId: category.id }}
                search={search(withIds.filter((id) => id !== tag.id))}
                className={`${chip} bg-zinc-800 text-zinc-50 hover:bg-zinc-700`}
                aria-label={`Remove ${tag.name}`}
              >
                {tag.name} ✕
              </Link>
            </li>
          ))}
        </ul>
      )}
      {canNarrow && related.length > 0 && (
        <details className="mb-6">
          <summary className="cursor-pointer text-zinc-500">Narrow by another tag</summary>
          {groupTags(related).map((group) => (
            <div key={group.id} className="mt-3">
              <p className="mb-1 text-xs font-bold uppercase text-zinc-400">{group.label}</p>
              <ul className="flex flex-wrap gap-2">
                {group.tags.map((tag) => (
                  <li key={tag.id}>
                    <Link
                      to="/categories/$categoryId"
                      params={{ categoryId: category.id }}
                      search={search([...withIds, tag.id])}
                      className={chip}
                    >
                      {tag.name} <span className="text-zinc-400">{tag.recipeCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      )}
      {recipes.length ? (
        <>
          <Link
            to="/categories/$categoryId"
            params={{ categoryId: category.id }}
            search={search(withIds, sort === "desc" ? "asc" : "desc")}
            className="mb-2 inline-block"
          >
            Sort: {sort === "desc" ? "Z - A ↓" : "A - Z ↑"}
          </Link>
          <ul>
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <RecipeSummary recipe={recipe} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="my-6 text-zinc-500">No recipes with {selected.length ? "all of these tags" : "this tag"}</p>
      )}
    </div>
  );
}
