import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { getCategories } from "~/models/category.server";

type LoaderData = {
  categories: Awaited<ReturnType<typeof getCategories>>;
};

export const loader: LoaderFunction = async () => {
  return json<LoaderData>({
    categories: await getCategories(),
  });
};

export const meta: MetaFunction = () => {
  return {
    title: `Recipes by category`,
    description: `Browse recipes for each category`,
  };
};

export default function Categories() {
  const data = useLoaderData() as LoaderData;

  return (
    <div className="relative min-h-screen bg-white ">
      <h2 className="mb-4 text-2xl md:mb-8">Categories</h2>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        {data.categories.map((category) => (
          <li key={category.id} className="mb-2 text-xl">
            <NavLink
              to={category.id}
              className={({ isActive }) =>
                `block capitalize ${
                  isActive ? "border-b-2 border-black" : "text-zinc-500"
                }`
              }
            >
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
