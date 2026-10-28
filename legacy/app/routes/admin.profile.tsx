import {
  ActionFunction,
  json,
  LoaderFunction,
  redirect,
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";

import { getUser, requireAdminUser, requireUser } from "~/session.server";
import { badRequest } from "~/errors.server";
import { updateUserName } from "~/models/user.server";

type LoaderData = {
  user: Awaited<ReturnType<typeof getUser>>;
};
export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  return json<LoaderData>({
    user,
  });
};

type ActionData = {
  formError?: string;
  fieldErrors?: {
    firstName: string | undefined;
    lastName: string | undefined;
  };
  fields?: {
    firstName: string;
    lastName: string;
  };
};

function validateFirstName(name: string | null) {
  if (typeof name !== "string" || !name.trim().length) {
    return "First Name required";
  }
}

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminUser(request);
  const user = await getUser(request);

  if (!user) {
    throw new Error("Somehow the user was missing... that should not happen");
  }

  let form = await request.formData();
  let firstName = form.get("firstName") as string | null;
  let lastName = form.get("lastName") as string | null;

  const fieldErrors = {
    firstName: validateFirstName(firstName),
  };
  const fields = { firstName };

  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields });
  }

  await updateUserName(user?.id, firstName as string, lastName || null);

  return redirect(`/admin/profile`);
};

export default function CreateCategory() {
  const { user } = useLoaderData() as LoaderData;
  const actionData = useActionData<ActionData>();

  return (
    <section>
      <h3 className="mb-12 text-3xl font-bold md:mb-24">Update User's Name</h3>
      <Form method="post" className="flex flex-col gap-4">
        <div className="flex w-full flex-col flex-nowrap md:max-w-sm">
          <label htmlFor="name" className="text-md mb-2 font-bold uppercase">
            First Name
          </label>
          <input
            className="rounded-lg bg-zinc-50 p-2"
            type="text"
            name="firstName"
            defaultValue={
              actionData?.fields?.firstName ?? user?.firstName ?? ""
            }
            aria-invalid={
              Boolean(actionData?.fieldErrors?.firstName) || undefined
            }
            aria-describedby={
              actionData?.fieldErrors?.firstName ? "firstName-error" : undefined
            }
          />
          {actionData?.fieldErrors?.firstName ? (
            <p className="text-red-600" role="alert" id="firstName-error">
              {actionData?.fieldErrors.firstName}
            </p>
          ) : null}

          <label htmlFor="name" className="text-md mb-2 font-bold uppercase">
            Last Name
          </label>
          <input
            className="rounded-lg bg-zinc-50 p-2"
            type="text"
            name="lastName"
            defaultValue={user?.lastName ?? ""}
            aria-invalid={
              Boolean(actionData?.fieldErrors?.lastName) || undefined
            }
            aria-describedby={
              actionData?.fieldErrors?.lastName ? "lastName-error" : undefined
            }
          />
          {actionData?.fieldErrors?.lastName ? (
            <p className="text-red-600" role="alert" id="lastName-error">
              {actionData?.fieldErrors.lastName}
            </p>
          ) : null}
        </div>
        <div className="flex max-w-sm justify-end gap-4">
          <Link
            className=" p-2 font-semibold capitalize tracking-wider text-zinc-700"
            to={`/categories`}
          >
            Cancel
          </Link>
          <button
            className="rounded-lg bg-teal-700 px-4 py-2 font-semibold capitalize tracking-widest text-zinc-50 hover:bg-teal-800"
            type="submit"
          >
            Save
          </button>
        </div>
      </Form>
    </section>
  );
}
