import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "~/server/auth/current-user";

function Menu({
  user,
  onNavigate,
}: {
  user: SessionUser | null;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const items = [
    ["/", "Home", "⌂"],
    ["/search", "Search (⌘ K)", "⌕"],
    ["/categories", "Categories", "◇"],
    ...(user
      ? [
          ["/favorites", "Favorites", "♡"],
          ["/recently-viewed", "Recently Viewed", "◷"],
          ["/recipes/new", "Add Recipe", "✎"],
          ["/profile", "Profile", "○"],
        ]
      : [["/login", "Sign in", "→"]]),
    ...(user?.role === "ADMIN"
      ? [
          ["/admin/invites", "Invites", "✉"],
          ["/admin/categories", "Manage Categories", "◇"],
        ]
      : []),
  ];
  const isActive = (href: string | undefined) =>
    pathname === href ||
    (href !== "/" && Boolean(href) && pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Main navigation">
      <ul>
        {items.map(([href, label, icon]) => (
          <li key={href}>
            <Link
              to={href}
              onClick={onNavigate}
              aria-current={isActive(href) ? "page" : undefined}
              className={`mx-6 my-3 flex items-center gap-3 rounded-lg px-4 py-3 text-xl ${isActive(href) ? "bg-white font-bold text-zinc-700" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              <span aria-hidden="true" className="w-5 text-center">
                {icon}
              </span>
              {label}
            </Link>
          </li>
        ))}
        {user && (
          <li>
            <form action="/logout" method="post">
              <button
                className="mx-6 my-3 flex items-center gap-3 px-4 py-3 text-xl text-zinc-500"
                type="submit"
              >
                <span aria-hidden="true">⇥</span>Log out
              </button>
            </form>
          </li>
        )}
      </ul>
    </nav>
  );
}
export function SiteHeader({ user }: { user: SessionUser | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        dialog.current?.close();
        void router.navigate({ to: "/search", search: { q: "" } });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);
  return (
    <header className="shrink-0 md:h-screen md:overflow-y-auto md:bg-gray-50">
      <div className="relative flex h-14 items-center justify-between md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="h-14 w-14 text-2xl"
          onClick={() => {
            dialog.current?.showModal();
            setOpen(true);
          }}
        >
          ☰
        </button>
        <Link
          to="/search"
          search={{ q: "" }}
          className="mr-2 rounded-full bg-zinc-100 px-3 py-2 text-zinc-500"
        >
          ⌕ Search
        </Link>
      </div>
      <dialog
        ref={dialog}
        id="mobile-menu"
        aria-labelledby="mobile-menu-title"
        onClose={() => setOpen(false)}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-white p-0 text-zinc-900 backdrop:bg-black/30"
      >
        <button
          autoFocus
          type="button"
          aria-label="Close menu"
          className="h-14 w-14 text-3xl"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <h2
          id="mobile-menu-title"
          className="px-10 pb-4 font-bold text-teal-700"
        >
          Homer Family Cookbook
        </h2>
        <Menu user={user} onNavigate={() => dialog.current?.close()} />
      </dialog>
      <div className="hidden min-h-full w-80 md:block">
        <Link to="/" className="mb-12 block p-10 font-bold text-teal-700">
          Homer Family Cookbook
        </Link>
        <Menu user={user} />
      </div>
    </header>
  );
}
