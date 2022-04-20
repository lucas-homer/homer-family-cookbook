import type {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  Links,
  LiveReload,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

import tailwindStylesheetUrl from "./styles/tailwind.css";
import mobileMenuStylesheetUrl from "./styles/mobile-menu.css";
import { getUser } from "./session.server";
import MobileMenu from "./components/mobile-menu";

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: tailwindStylesheetUrl },
    { rel: "stylesheet", href: mobileMenuStylesheetUrl },
  ];
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Homer Family Cookbook",
  viewport: "width=device-width,initial-scale=1",
});

type LoaderData = {
  user: Awaited<ReturnType<typeof getUser>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  return json<LoaderData>({
    user: await getUser(request),
  });
};

export default function App() {
  const data = useLoaderData() as LoaderData;

  return (
    <html lang="en" className="h-full">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="flex h-full min-h-screen flex-col flex-nowrap md:flex-row">
        <div>
          <MobileMenu userLoggedIn={data.user ? true : false} />
        </div>
        <nav className="hidden h-full w-80 border-r bg-gray-50 md:block">
          <ul>
            <li>
              <NavLink
                className={({ isActive }) =>
                  `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
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
                  `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                }
                to="search"
              >
                🔎 Search
              </NavLink>
            </li>
            <li>
              <NavLink
                className={({ isActive }) =>
                  `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                }
                to="categories"
              >
                📚 Categories
              </NavLink>
            </li>
            {data.user && (
              <>
                <li>
                  <NavLink
                    className={({ isActive }) =>
                      `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                    }
                    to="favorites"
                  >
                    ❤️ Favorites
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    className={({ isActive }) =>
                      `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                    }
                    to="recently-viewed"
                  >
                    ⏲ Recently Viewed
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    className={({ isActive }) =>
                      `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
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
                      className="block w-full border-b p-4 text-left text-xl"
                    >
                      🔒 Logout
                    </button>
                  </Form>
                </li>
              </>
            )}
            {!data.user ? (
              <li>
                <Form action="/login" method="post">
                  <button
                    type="submit"
                    className="block w-full border-b  p-4 text-left text-xl"
                  >
                    🔓 Login
                  </button>
                </Form>
              </li>
            ) : null}
          </ul>
        </nav>

        <main className="flex-1 p-6">
          <Outlet />
        </main>

        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
