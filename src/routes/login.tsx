import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSessionUser, loginFn } from "~/server/auth/functions";
import { safeRedirectTo } from "~/server/auth/redirect";

interface LoginSearch {
  redirectTo?: string;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch =>
    typeof search.redirectTo === "string" ? { redirectTo: search.redirectTo } : {},
  beforeLoad: async ({ search }) => {
    // Already signed in: go where they were heading (same-origin paths only).
    if (await getSessionUser()) throw redirect({ href: safeRedirectTo(search.redirectTo) });
  },
  head: () => ({ meta: [{ title: "Login | Homer Family Cookbook" }] }),
  component: LoginPage,
});

type Errors = Readonly<Record<string, string>>;

function LoginPage() {
  const { redirectTo } = Route.useSearch();
  const router = useRouter();
  const login = useServerFn(loginFn);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (errors.email || errors.form) emailRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
  }, [errors]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await login({
        data: {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          redirectTo: redirectTo ?? null,
        },
      });
      if (!result.ok) {
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

  const emailError = errors.email ?? errors.form;

  return (
    <div className="flex min-h-full flex-col justify-center py-12">
      <div className="mx-auto w-full max-w-md px-4 md:px-8">
        <form method="post" className="space-y-6" noValidate onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1">
              <input
                ref={emailRef}
                id="email"
                required
                autoFocus
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={emailError ? true : undefined}
                aria-describedby="email-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {emailError && (
                <div className="pt-1 text-red-700" id="email-error" role="alert">
                  {emailError}
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby="password-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {errors.password && (
                <div className="pt-1 text-red-700" id="password-error" role="alert">
                  {errors.password}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:opacity-60"
          >
            {pending ? "Logging in…" : "Log in"}
          </button>
          <p className="text-center text-sm text-gray-500">
            New here? Accounts are by invitation. Ask a family admin for an invite link.
          </p>
        </form>
      </div>
    </div>
  );
}
