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
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: "/favicons/apple-touch-icon.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/favicons/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "/favicons/favicon-16x16.png",
    },
    { rel: "manifest", href: "/site.webmanifest" },
    { rel: "icon", href: "/favicon.ico" },
  ];
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Homer Family Cookbook",
  description: "For all the old classics and the new ones to come",
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

        <SkipNavContent className="flex flex-1 flex-col overflow-y-auto">
          <main className="flex-1 p-6 md:px-8">
            <Outlet />
          </main>
        </SkipNavContent>

        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
