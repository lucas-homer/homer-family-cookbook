import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/categories/")({
  component: () => (
    <p className="my-6 text-zinc-500">Choose a recipe category</p>
  ),
});
