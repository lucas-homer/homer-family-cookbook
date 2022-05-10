import type {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import skipNavStyles from "@reach/skip-nav/styles.css";
import tailwindStylesheetUrl from "./styles/tailwind.css";
import globalStylesheetUrl from "./styles/globals.css";
import mobileMenuStylesheetUrl from "./styles/mobile-menu.css";
import { getUser } from "./session.server";
import MobileMenu from "./components/mobile-menu";
import DesktopMenu from "./components/desktop-menu";
import SearchButton from "./components/search-button";
import { SkipNavContent, SkipNavLink } from "@reach/skip-nav";

export const links: LinksFunction = () => {
  return [
    {
      rel: "preload",
      as: "font",
      href: "/fonts/lato-v22-latin-700.woff2",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
    {
      rel: "preload",
      as: "font",
      href: "/fonts/lato-v22-latin-700italic.woff2",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
    {
      rel: "preload",
      as: "font",
      href: "/fonts/lato-v22-latin-italic.woff2",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
    {
      rel: "preload",
      as: "font",
      href: "/fonts/lato-v22-latin-regular.woff2",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
    { rel: "stylesheet", href: globalStylesheetUrl },
    { rel: "stylesheet", href: tailwindStylesheetUrl },
    { rel: "stylesheet", href: mobileMenuStylesheetUrl },
    {
      rel: "stylesheet",
      href: skipNavStyles,
    },
    {
      rel: "icon",
      type: "image/x-icon",
      href: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍪</text></svg>",
    },
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
        <SkipNavLink />

        <header className="md:h-full md:min-h-screen md:overflow-y-auto">
          <MobileMenu userLoggedIn={Boolean(data.user)} />
          <SearchButton />
          <DesktopMenu userLoggedIn={Boolean(data.user)} />
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:px-8">
          <SkipNavContent>
            <Outlet />
          </SkipNavContent>
        </main>

        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
