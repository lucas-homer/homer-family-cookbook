import * as React from "react";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useSearchParams,
  useTransition,
} from "@remix-run/react";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";

import { requestResetToken } from "~/models/user.server";
import { getUserId } from "~/lib/session.server";
import { validateEmail } from "~/lib/utils";
import { sendResetTokenEmail } from "~/lib/email.server";

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
};

interface ActionData {
  errors?: {
    email?: string;
  };
  resetTokenStatus?: "success";
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email");
  if (!validateEmail(email)) {
    return json<ActionData>(
      { errors: { email: "Email is invalid" } },
      { status: 400 }
    );
  }

  const { token, error, status } = await requestResetToken(email); // generate a reset token and expiry and save it to the user record

  if (!token) {
    return json<ActionData>({ errors: { email: error } }, { status });
  }

  try {
    await sendResetTokenEmail(email, token);
  } catch (e) {
    console.error(e);
    return json<ActionData>(
      { errors: { email: "Oh no! Error sending reset email." } },
      { status: 502 }
    );
  }

  return json<ActionData>({
    resetTokenStatus: "success",
  });
};

export const meta: MetaFunction = () => {
  return {
    title: "Forgot Password",
  };
};

export default function ForgotPassword() {
  const transition = useTransition();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const actionData = useActionData() as ActionData;
  const emailRef = React.useRef<HTMLInputElement>(null);
  const resetFormRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    }
    if (actionData?.resetTokenStatus === "success") {
      resetFormRef.current?.reset();
      emailRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-4 md:px-8">
        <Form method="post" className="space-y-6" noValidate ref={resetFormRef}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <div className="mt-1">
              <input
                ref={emailRef}
                id="email"
                required
                autoFocus={true}
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={actionData?.errors?.email ? true : undefined}
                aria-describedby="email-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.email && (
                <div className="pt-1 text-red-700" id="email-error">
                  {actionData.errors.email}
                </div>
              )}
              {actionData?.resetTokenStatus === "success" && (
                <div className="pt-1 text-green-700" id="email-error">
                  Check your email for a reset link.
                </div>
              )}
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            disabled={transition.state === "loading"}
            type="submit"
            className="w-full rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            {transition.state === "submitting"
              ? "Sending..."
              : "Send reset link"}
          </button>
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div className="text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link
                className="text-blue-500 underline"
                to={{
                  pathname: "/join",
                  search: searchParams.toString(),
                }}
              >
                Sign up
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
