import {
  ClockIcon,
  EnterIcon,
  ExitIcon,
  HeartIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  Pencil2Icon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { Form, NavLink } from "@remix-run/react";

export default function DesktopMenu({
  userLoggedIn,
}: {
  userLoggedIn: boolean;
}) {
  const getNavLinkStyles = (isActive: boolean) => {
    return `flex w-full items-center gap-3  py-4 pl-8 text-xl ${
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
              <div>
                <HomeIcon height={18} width={18} />
              </div>

              <span>Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              className={({ isActive }) => getNavLinkStyles(isActive)}
              to="search"
            >
              <div>
                <MagnifyingGlassIcon height={18} width={18} />
              </div>
              <span>Search</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              className={({ isActive }) => getNavLinkStyles(isActive)}
              to="categories"
            >
              <div>
                <RocketIcon height={18} width={18} />
              </div>
              <span>Categories</span>
            </NavLink>
          </li>
          {userLoggedIn ? (
            <>
              <li>
                <NavLink
                  className={({ isActive }) => getNavLinkStyles(isActive)}
                  to="favorites"
                >
                  <div>
                    <HeartIcon height={18} width={18} />
                  </div>
                  <span>Favorites</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  className={({ isActive }) => getNavLinkStyles(isActive)}
                  to="recently-viewed"
                >
                  <div>
                    <ClockIcon height={18} width={18} />
                  </div>
                  <span>Recently Viewed</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  className={({ isActive }) => getNavLinkStyles(isActive)}
                  to="recipes/new"
                >
                  <div>
                    <Pencil2Icon height={18} width={18} />
                  </div>
                  <span>Add Recipe</span>
                </NavLink>
              </li>
              <li>
                <Form action="/logout" method="post">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3  py-4 pl-8 text-left text-xl text-zinc-500"
                  >
                    <div>
                      <ExitIcon height={18} width={18} />
                    </div>
                    <span>Logout</span>
                  </button>
                </Form>
              </li>
            </>
          ) : (
            <li>
              <Form action="/login">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3   py-4 pl-8 text-left text-xl text-zinc-500"
                >
                  <div>
                    <EnterIcon height={18} width={18} />
                  </div>
                  <span>Login</span>
                </button>
              </Form>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
