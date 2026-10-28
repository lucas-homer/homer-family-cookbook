import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { getCategories } from "~/server/categories/read";
export const Route = createFileRoute("/categories")({
  loader: () => getCategories(),
  head: () => ({
    meta: [
      { title: "Recipes by category" },
      { name: "description", content: "Browse recipes for each category" },
    ],
  }),
  component: Categories,
});
function Categories() {
  const categories = Route.useLoaderData();
  return (
    <div>
      <h1 className="mb-4 text-2xl md:mb-8">Categories</h1>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        {categories.map((category) => (
          <li key={category.id} className="mb-2 text-xl">
            <Link
              to="/categories/$categoryId"
              params={{ categoryId: category.id }}
              search={{ sort: "asc" }}
              activeOptions={{ includeSearch: false }}
              className="block capitalize text-zinc-500"
              activeProps={{
                className: "border-b-2 border-black text-zinc-900",
              }}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
      <Outlet />
    </div>
  );
}
