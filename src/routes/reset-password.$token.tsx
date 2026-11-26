import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { getResetTokenOpen, resetPasswordFn } from "~/server/auth/functions";

// The link from a reset email: /reset-password/<token>, good for 1 hour, once.
export const Route = createFileRoute("/reset-password/$token")({
  loader: ({ params }) => getResetTokenOpen({ data: { token: params.token } }),
  // The token is a credential: keep it out of Referer headers and caches.
  head: () => ({
    meta: [{ title: "Reset password | Homer Family Cookbook" }, { name: "referrer", content: "no-referrer" }],
  }),
  staleTime: 0,
  gcTime: 0,
  component: ResetPasswordPage,
});

type Errors = Readonly<Record<string, string>>;

function ResetPasswordPage() {
  const open = Route.useLoaderData();
  const { token } = Route.useParams();
  const router = useRouter();
  const reset = useServerFn(resetPasswordFn);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [expired, setExpired] = useState(!open);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setErrors({ confirm: "The passwords don't match" });
      return;
    }
    setPending(true);
    try {
      const result = await reset({ data: { token, password } });
      if (!result.ok) {
        if (result.fieldErrors.form) setExpired(true);
        setErrors(result.fieldErrors);
        return;
      }
      await router.invalidate();
      await router.navigate({ href: result.value.redirectTo, replace: true });
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center py-12">
      <div className="mx-auto w-full max-w-md px-4 md:px-8">
        {expired ? (
          <div className="space-y-4 text-center">
            <p className="text-lg text-red-700" role="alert">
              {errors.form ?? "This reset link is not valid or has expired. Ask for a new one."}
            </p>
            <Link className="text-blue-500 underline" to="/forgot-password">
              Send a new link
            </Link>
          </div>
        ) : (
          <form method="post" className="space-y-6" noValidate onSubmit={onSubmit}>
            <p className="text-gray-700">Choose a new password. You'll be signed out on your other devices.</p>
            {(["password", "confirm"] as const).map((name) => (
              <div key={name}>
                <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                  {name === "password" ? "New password" : "New password again"}
                </label>
                <div className="mt-1">
                  <input
                    id={name}
                    name={name}
                    type="password"
                    required
                    autoFocus={name === "password"}
                    autoComplete="new-password"
                    aria-invalid={errors[name] ? true : undefined}
                    aria-describedby={`${name}-error`}
                    className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                  />
                  {errors[name] && (
                    <div className="pt-1 text-red-700" id={`${name}-error`} role="alert">
                      {errors[name]}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
