import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getRecentlyViewed } from "~/models/user.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  recipes: Awaited<ReturnType<typeof getRecentlyViewed>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const recipes = await getRecentlyViewed(userId);

  return json<LoaderData>({ recipes });
};

export default function RecentlyViewed() {
  const { recipes } = useLoaderData() as LoaderData;
  return (
    <>
      <h2>recently viewed</h2>
      <pre>
        <code>{JSON.stringify(recipes, null, 2)}</code>
      </pre>
    </>
  );
}
