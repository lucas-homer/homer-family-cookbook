import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Homer Family Cookbook" },
      {
        name: "description",
        content: "For all the old classics and the new ones to come",
      },
    ],
  }),
  component: () => (
    <div className="flex min-h-[80vh] items-center justify-center">
      <h1 className="text-3xl">Homer Family Cookbook</h1>
    </div>
  ),
});
