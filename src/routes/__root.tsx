/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "~/components/layout/site-header";
import { getViewer } from "~/server/viewer";
import appCss from "~/styles/app.css?url";

const fontPreloads = ["700", "700italic", "italic", "regular"].map(
  (variant) => ({
    rel: "preload",
    as: "font",
    href: `/fonts/lato-v22-latin-${variant}.woff2`,
    type: "font/woff2",
    crossOrigin: "anonymous" as const,
  }),
);

export const Route = createRootRoute({
  beforeLoad: async () => ({ viewer: await getViewer() }),
  notFoundComponent: () => (
    <div className="py-12">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-4">That recipe or page could not be found.</p>
      <a className="underline" href="/">
        Go home
      </a>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div role="alert" className="py-12">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="my-4">We couldn’t load this page. Please try again.</p>
      <button className="rounded border px-4 py-2" onClick={reset}>
        Try again
      </button>
    </div>
  ),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Homer Family Cookbook" },
      {
        name: "description",
        content: "For all the old classics and the new ones to come",
      },
    ],
    links: [
      ...fontPreloads,
      { rel: "stylesheet", href: appCss },
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
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  const { viewer } = Route.useRouteContext();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-4"
      >
        Skip to content
      </a>
      <SiteHeader user={viewer} />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-w-0 flex-1 p-6 outline-none md:h-screen md:overflow-y-auto md:px-8"
      >
        <Outlet />
      </main>
    </>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col font-sans text-zinc-900 md:h-full md:flex-row">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
