import { createFileRoute } from "@tanstack/react-router";
import { endSession } from "~/server/auth/cookies";
import { isSameOriginRequest } from "~/server/auth/csrf";
import { runServer } from "~/server/run";

// POST /logout signs out: deletes the session row, clears the cookie and
// redirects home. It's a plain route handler so `<form method="post"
// action="/logout">` works with or without JavaScript. GET only shows a button.
export const Route = createFileRoute("/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 });
        await runServer(endSession);
        return new Response(null, { status: 303, headers: { Location: "/" } });
      },
    },
  },
  head: () => ({ meta: [{ title: "Log out | Homer Family Cookbook" }] }),
  component: LogoutPage,
});

function LogoutPage() {
  return (
    <div className="flex min-h-full flex-col justify-center py-12">
      <form method="post" action="/logout" className="mx-auto w-full max-w-md space-y-4 px-4 text-center md:px-8">
        <p className="text-lg">Log out of the Homer Family Cookbook?</p>
        <button
          type="submit"
          className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
