import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { getJoinInvite, joinFn, type JoinInvite } from "~/server/auth/functions";

// One-time signup link from an admin: /join/<token>. There is no public /join.
export const Route = createFileRoute("/join/$token")({
  loader: ({ params }) => getJoinInvite({ data: { token: params.token } }),
  // The token is a credential: keep it out of Referer headers and caches.
  head: () => ({
    meta: [{ title: "Join | Homer Family Cookbook" }, { name: "referrer", content: "no-referrer" }],
  }),
  staleTime: 0,
  gcTime: 0,
  component: JoinPage,
});

type Errors = Readonly<Record<string, string>>;

function JoinPage() {
  const invite = Route.useLoaderData();
  return (
    <div className="flex min-h-full flex-col justify-center py-12">
      <div className="mx-auto w-full max-w-md px-4 md:px-8">
        {invite.ok ? (
          <JoinForm invite={invite} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-lg text-red-700" role="alert">
              {invite.message}
            </p>
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link className="text-blue-500 underline" to="/login">
                Log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function JoinForm({ invite }: { invite: Extract<JoinInvite, { ok: true }> }) {
  const { token } = Route.useParams();
  const router = useRouter();
  const join = useServerFn(joinFn);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const refs = {
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    firstName: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    const first = (["email", "password", "firstName"] as const).find((key) => errors[key]);
    if (first) refs[first].current?.focus();
  }, [errors]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirmPassword") ?? "")) {
      setErrors({ confirmPassword: "Passwords don't match" });
      return;
    }
    setPending(true);
    try {
      const result = await join({
        data: {
          token,
          email: invite.email ?? String(form.get("email") ?? ""),
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          password,
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

  return (
    <form method="post" className="space-y-6" noValidate onSubmit={onSubmit}>
      <h1 className="text-2xl font-bold">Join the Homer Family Cookbook</h1>
      {errors.form && (
        <p className="text-red-700" role="alert">
          {errors.form}
        </p>
      )}

      <Field label="Email address" name="email" error={errors.email}>
        <input
          ref={refs.email}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={invite.email ?? ""}
          readOnly={invite.email !== null}
          autoFocus={invite.email === null}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby="email-error"
          className="w-full rounded border border-gray-500 px-2 py-1 text-lg read-only:bg-gray-100"
        />
      </Field>

      <Field label="First name" name="firstName" error={errors.firstName}>
        <input
          ref={refs.firstName}
          id="firstName"
          name="firstName"
          type="text"
          autoComplete="given-name"
          required
          autoFocus={invite.email !== null}
          aria-invalid={errors.firstName ? true : undefined}
          aria-describedby="firstName-error"
          className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
        />
      </Field>

      <Field label="Last name" name="lastName" error={errors.lastName}>
        <input
          id="lastName"
          name="lastName"
          type="text"
          autoComplete="family-name"
          className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
        />
      </Field>

      <Field label="Password" name="password" error={errors.password} hint="At least 8 characters.">
        <input
          ref={refs.password}
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="password-error"
          className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
        />
      </Field>

      <Field label="Confirm password" name="confirmPassword" error={errors.confirmPassword}>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={errors.confirmPassword ? true : undefined}
          aria-describedby="confirmPassword-error"
          className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create Account"}
      </button>
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link className="text-blue-500 underline" to="/login">
          Log in
        </Link>
      </p>
    </form>
  );
}

function Field(props: { label: string; name: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={props.name} className="block text-sm font-medium text-gray-700">
        {props.label}
      </label>
      <div className="mt-1">
        {props.children}
        {props.hint && !props.error && <p className="pt-1 text-sm text-gray-500">{props.hint}</p>}
        {props.error && (
          <div className="pt-1 text-red-700" id={`${props.name}-error`} role="alert">
            {props.error}
          </div>
        )}
      </div>
    </div>
  );
}
