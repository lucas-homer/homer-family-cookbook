import { Form, NavLink } from "@remix-run/react";

export default function DesktopMenu({
  userLoggedIn,
}: {
  userLoggedIn: boolean;
}) {
  return (
    <>
      <nav className="hidden h-full w-80 bg-gray-50 md:block">
        <ul>
          <li>
            <NavLink
              className={({ isActive }) =>
                `block  p-4 text-xl ${isActive ? "bg-white" : ""}`
              }
              to="."
              aria-label="Home"
            >
              🏠 Home
            </NavLink>
          </li>
          <li>
            <NavLink
              className={({ isActive }) =>
                `block  p-4 text-xl ${isActive ? "bg-white" : ""}`
              }
              to="search"
            >
              🔎 Search
            </NavLink>
          </li>
          <li>
            <NavLink
              className={({ isActive }) =>
                `block  p-4 text-xl ${isActive ? "bg-white" : ""}`
              }
              to="categories"
            >
              📚 Categories
            </NavLink>
          </li>
          {userLoggedIn ? (
            <>
              <li>
                <NavLink
                  className={({ isActive }) =>
                    `block p-4 text-xl ${isActive ? "bg-white" : ""}`
                  }
                  to="favorites"
                >
                  ❤️ Favorites
                </NavLink>
              </li>
              <li>
                <NavLink
                  className={({ isActive }) =>
                    `block  p-4 text-xl ${isActive ? "bg-white" : ""}`
                  }
                  to="recently-viewed"
                >
                  ⏲ Recently Viewed
                </NavLink>
              </li>
              <li>
                <NavLink
                  className={({ isActive }) =>
                    `block  p-4 text-xl ${isActive ? "bg-white" : ""}`
                  }
                  to="recipes/new"
                >
                  📝 Add Recipe
                </NavLink>
              </li>
              <li>
                <Form action="/logout" method="post">
                  <button
                    type="submit"
                    className="block w-full  p-4 text-left text-xl"
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
                  className="block w-full   p-4 text-left text-xl"
                >
                  🔓 Login
                </button>
              </Form>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
