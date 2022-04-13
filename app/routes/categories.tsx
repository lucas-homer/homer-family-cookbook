import { json, LoaderFunction } from "@remix-run/node";
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

export default function Categories() {
  const data = useLoaderData() as LoaderData;

  return (
    <div className="relative min-h-screen bg-white ">
      <h2 className="mb-8 text-2xl">Categories</h2>
      <ul className="mb-4 flex flex-wrap gap-4">
        {data.categories.map((category) => (
          <li key={category.id} className="mb-2 text-xl">
            <NavLink
              to={category.id}
              className={({ isActive }) =>
                `block ${isActive ? "border-b border-black" : ""}`
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
