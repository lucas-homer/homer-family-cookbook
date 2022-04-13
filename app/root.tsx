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
import { getUser } from "./session.server";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: tailwindStylesheetUrl }];
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
      <body className="flex h-full min-h-screen flex-col">
        <header className="flex flex-nowrap items-center justify-between bg-gray-50 p-2">
          <h1 className="text-3xl">
            <Link
              to="/"
              title="Homer Family Cookbook"
              aria-label="Homer Family Cookbook"
            >
              HFC
            </Link>
          </h1>

          {data.user ? (
            <div className="flex gap-4">
              <Form action="/logout" method="post">
                <button className="rounded-lg border border-2 border-black p-2">
                  Logout
                </button>
              </Form>
            </div>
          ) : (
            <Form action="/login" method="post">
              <button className="rounded-lg border border-2 border-black p-2">
                Login
              </button>
            </Form>
          )}
        </header>
        <div className="flex h-full bg-white">
          <div className="h-full w-80 border-r bg-gray-50">
            <nav>
              <ul>
                <li>
                  <NavLink
                    className={({ isActive }) =>
                      `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                    }
                    to="."
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
                          `block border-b p-4 text-xl ${
                            isActive ? "bg-white" : ""
                          }`
                        }
                        to="saved"
                      >
                        ❤️ Saved
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        className={({ isActive }) =>
                          `block border-b p-4 text-xl ${
                            isActive ? "bg-white" : ""
                          }`
                        }
                        to="recently-viewed"
                      >
                        ⏲ Recently Viewed
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        className={({ isActive }) =>
                          `block border-b p-4 text-xl ${
                            isActive ? "bg-white" : ""
                          }`
                        }
                        to="recipes/new"
                      >
                        📝 Add Recipe
                      </NavLink>
                    </li>
                  </>
                )}
              </ul>
            </nav>
          </div>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>

        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
