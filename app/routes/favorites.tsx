import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { NavLink, Outlet, useLoaderData, useLocation } from "@remix-run/react";
import { getFavoriteCategories } from "~/models/category.server";
import { requireUserId } from "~/lib/session.server";

type LoaderData = {
  favoriteCategories: Awaited<ReturnType<typeof getFavoriteCategories>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const favoriteCategories = await getFavoriteCategories(userId);
  return json<LoaderData>({
    favoriteCategories,
  });
};

export const meta: MetaFunction = () => {
  return {
    title: `Favorites`,
    description: `Browse your favorite recipes`,
  };
};

export default function Favorites() {
  const { favoriteCategories } = useLoaderData() as LoaderData;
  const { pathname } = useLocation();
  const isIndexRoute = pathname === "/favorites";

  return (
    <div className="relative min-h-screen bg-white ">
      <h2 className="mb-4 text-2xl md:mb-8">Favorites</h2>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        <li className="mb-2 text-xl">
          <NavLink
            to="/favorites"
            className={`block ${
              isIndexRoute ? "border-b-2 border-black" : "text-zinc-500"
            }`}
          >
            All
          </NavLink>
        </li>
        {favoriteCategories.map((category) => (
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
