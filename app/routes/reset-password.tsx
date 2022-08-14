import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import * as React from "react";

import { createUserSession } from "~/lib/session.server";

import { updateUserPassword, verifyToken } from "~/models/user.server";

type LoaderData = {
  email: string;
  token: string;
  error?: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!email || !token) {
    return json({ error: "Missing email or token" });
  }

  const results = await verifyToken(email, token);

  if (results.error) {
    return json({
      error: results.error,
    });
  }

  return json<LoaderData>({
    email,
    token,
  });
};

interface ActionData {
  error: string;
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const password = formData.get("password");
  const email = formData.get("email");
  const token = formData.get("token");

  if (typeof email !== "string") {
    return json<ActionData>(
      {
        error: "Missing email",
      },
      { status: 404 }
    );
  }
  if (typeof token !== "string") {
    return json<ActionData>(
      {
        error: "Missing token",
      },
      { status: 404 }
    );
  }

  const results = await verifyToken(email, token);

  if (results.error) {
    return json<ActionData>(
      { error: results.error },
      { status: results.status }
    );
  }

  if (typeof password !== "string") {
    return json<ActionData>({ error: "Password is required" }, { status: 400 });
  }

  if (password.length < 8) {
    return json<ActionData>(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const user = await updateUserPassword(email, password);

  return createUserSession({
    request,
    userId: user.id,
    remember: false,
    redirectTo: "/",
  });
};

export const meta: MetaFunction = () => {
  return {
    title: "Reset Password",
  };
};

export default function ResetPassword() {
  const loaderData = useLoaderData() as LoaderData;
  const actionData = useActionData() as ActionData;
  const passwordRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.error) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-4 md:px-8">
        <Form method="post" className="space-y-6" noValidate>
          <div>
            <input type="hidden" name="email" value={loaderData.email} />
            <input type="hidden" name="token" value={loaderData.token} />

            {loaderData.error && (
              <div className="mb-2 pt-1 text-lg text-red-700" id="token-error">
                {loaderData.error}
              </div>
            )}
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={actionData?.error ? true : undefined}
                aria-describedby="password-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.error && (
                <div className="pt-1 text-red-700" id="password-error">
                  {actionData.error}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            Save New Password
          </button>
          <div className="flex items-center justify-center">
            <div className="text-center text-sm text-gray-500">
              Token expired?{" "}
              <Link
                className="text-blue-500 underline"
                to={{
                  pathname: "/forgot-password",
                }}
              >
                Request a new one
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
