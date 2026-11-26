import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { requestPasswordResetFn } from "~/server/auth/functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password | Homer Family Cookbook" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const request = useServerFn(requestPasswordResetFn);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setPending(true);
    setError(null);
    try {
      const result = await request({ data: { email } });
      if (!result.ok) setError(result.fieldErrors.email ?? result.fieldErrors.form ?? "Something went wrong. Please try again.");
      else setSentTo(email.trim());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center py-12">
      <div className="mx-auto w-full max-w-md px-4 md:px-8">
        {sentTo ? (
          <div className="space-y-4 text-center" role="status">
            <p className="text-lg">If {sentTo} has an account, we've sent it a link to reset the password.</p>
            <p className="text-sm text-gray-500">The link works for 1 hour. Check your spam folder if it doesn't arrive in a few minutes.</p>
            <Link className="text-blue-500 underline" to="/login">
              Back to log in
            </Link>
          </div>
        ) : (
          <form method="post" className="space-y-6" noValidate onSubmit={onSubmit}>
            <p className="text-gray-700">Enter the email you log in with and we'll send you a link to choose a new password.</p>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  required
                  autoFocus
                  name="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={error ? true : undefined}
                  aria-describedby="email-error"
                  className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                />
                {error && (
                  <div className="pt-1 text-red-700" id="email-error" role="alert">
                    {error}
                  </div>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-center text-sm text-gray-500">
              <Link className="text-blue-500 underline" to="/login">
                Back to log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
