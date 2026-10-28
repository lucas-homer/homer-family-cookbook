import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { getFavoriteCategories } from "~/server/favorites.functions";

export const Route = createFileRoute("/favorites")({
  loader: () => getFavoriteCategories(),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.firstName}'s Favorite Recipes` : "Favorites" },
      { name: "description", content: "Browse your favorite recipes" },
    ],
  }),
  component: Favorites,
});

const tabClass = "block capitalize text-zinc-500";
const activeTab = { className: "border-b-2 border-black text-zinc-900" };

function Favorites() {
  const { categories } = Route.useLoaderData();
  return (
    <div className="relative min-h-screen bg-white">
      <h1 className="mb-4 text-2xl md:mb-8">Favorites</h1>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        <li className="mb-2 text-xl">
          <Link to="/favorites" activeOptions={{ exact: true, includeSearch: false }} className={tabClass} activeProps={activeTab}>
            All
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id} className="mb-2 text-xl">
            <Link
              to="/favorites/$categoryId"
              params={{ categoryId: category.id }}
              activeOptions={{ includeSearch: false }}
              className={tabClass}
              activeProps={activeTab}
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
