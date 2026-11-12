import { createFileRoute, Outlet } from "@tanstack/react-router";
// URLs stay /categories/... so existing links keep working; the UI says tags.
export const Route = createFileRoute("/categories")({
  component: () => <Outlet />,
});
