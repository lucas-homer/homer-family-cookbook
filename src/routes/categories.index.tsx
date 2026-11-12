import { createFileRoute, Link } from "@tanstack/react-router";
import { groupTags } from "~/lib/tag-groups";
import { getCategories } from "~/server/categories/read";
export const Route = createFileRoute("/categories/")({
  loader: () => getCategories(),
  head: () => ({
    meta: [
      { title: "Browse recipes by tag" },
      { name: "description", content: "Browse recipes by course, ingredient, occasion and family" },
    ],
  }),
  component: Tags,
});
function Tags() {
  const groups = groupTags(Route.useLoaderData().filter((tag) => tag.recipeCount > 0));
  return (
    <div>
      <h1 className="mb-4 text-2xl md:mb-8">Browse by tag</h1>
      {groups.length ? (
        groups.map((group) => (
          <section key={group.id} className="mb-8">
            <h2 className="mb-2 font-bold uppercase">{group.label}</h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {group.tags.map((tag) => (
                <li key={tag.id} className="text-lg">
                  <Link
                    to="/categories/$categoryId"
                    params={{ categoryId: tag.id }}
                    search={{ sort: "asc" }}
                    className="text-zinc-700 underline-offset-4 hover:underline"
                  >
                    {tag.name}
                  </Link>{" "}
                  <span className="text-sm text-zinc-400">{tag.recipeCount}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="my-6 text-zinc-500">No tags yet</p>
      )}
    </div>
  );
}
