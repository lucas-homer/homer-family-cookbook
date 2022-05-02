import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";

import { createCategory } from "~/models/category.server";
import { requireAdminUser } from "~/session.server";
import { badRequest } from "~/errors.server";

export const loader: LoaderFunction = async ({ params, request }) => {
  await requireAdminUser(request);
  return null;
};

type ActionData = {
  formError?: string;
  fieldErrors?: {
    name: string | undefined;
  };
  fields?: {
    name: string;
  };
};

function validateCategoryName(name: string | null) {
  if (typeof name !== "string" || !name.trim().length) {
    return "Name required";
  }
}

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminUser(request);

  let form = await request.formData();
  let name = form.get("name") as string | null;

  const fieldErrors = {
    name: validateCategoryName(name),
  };
  const fields = { name };

  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields });
  }

  await createCategory(name as string);

  return redirect(`/categories`);
};

export default function CreateCategory() {
  const actionData = useActionData<ActionData>();

  return (
    <section>
      <h3 className="mb-12 text-3xl font-bold md:mb-24">Create Category</h3>
      <Form method="post" className="flex flex-col gap-4">
        <div className="flex w-full flex-col flex-nowrap md:max-w-sm">
          <label htmlFor="name" className="text-md mb-2 font-bold uppercase">
            Name
          </label>
          <input
            className="rounded-lg bg-zinc-50 p-2"
            type="text"
            name="name"
            defaultValue={actionData?.fields?.name ?? ""}
            aria-invalid={Boolean(actionData?.fieldErrors?.name) || undefined}
            aria-describedby={
              actionData?.fieldErrors?.name ? "name-error" : undefined
            }
          />
          {actionData?.fieldErrors?.name ? (
            <p className="text-red-600" role="alert" id="name-error">
              {actionData?.fieldErrors.name}
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
