import { Form, NavLink } from "@remix-run/react";

export default function DesktopMenu({
  userLoggedIn,
}: {
  userLoggedIn: boolean;
}) {
  const getNavLinkStyles = (isActive: boolean) => {
    return `block  py-4 pl-8 text-xl ${
      isActive ? "bg-white font-semibold text-zinc-700" : "text-zinc-500"
    }`;
  };
  return (
    <div className="hidden h-full w-80 bg-gray-50 md:block">
      <h3 className="mb-12 p-8 font-extrabold text-teal-700">
        Homer Family Cookbook
      </h3>
      <nav className="mb-12">
        <ul>
          <li>
            <NavLink
              className={({ isActive }) => getNavLinkStyles(isActive)}
              to="."
              aria-label="Home"
            >
              🏠 <span>Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              className={({ isActive }) => getNavLinkStyles(isActive)}
              to="search"
            >
              🔎 Search
            </NavLink>
          </li>
          <li>
            <NavLink
              className={({ isActive }) => getNavLinkStyles(isActive)}
              to="categories"
            >
              📚 Categories
            </NavLink>
          </li>
          {userLoggedIn ? (
            <>
              <li>
                <NavLink
                  className={({ isActive }) => getNavLinkStyles(isActive)}
                  to="favorites"
                >
                  ❤️ Favorites
                </NavLink>
              </li>
              <li>
                <NavLink
                  className={({ isActive }) => getNavLinkStyles(isActive)}
                  to="recently-viewed"
                >
                  ⏲ Recently Viewed
                </NavLink>
              </li>
              <li>
                <NavLink
                  className={({ isActive }) => getNavLinkStyles(isActive)}
                  to="recipes/new"
                >
                  📝 Add Recipe
                </NavLink>
              </li>
              <li>
                <Form action="/logout" method="post">
                  <button
                    type="submit"
                    className="block w-full  py-4 pl-8 text-left text-xl text-zinc-500"
                  >
                    🔒 Logout
                  </button>
                </Form>
              </li>
            </>
          ) : (
            <li>
              <Form action="/login" method="post">
                <button
                  type="submit"
                  className="block w-full   py-4 pl-8 text-left text-xl text-zinc-500"
                >
                  🔓 Login
                </button>
              </Form>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
