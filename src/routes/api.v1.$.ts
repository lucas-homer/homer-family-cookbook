import { createFileRoute } from "@tanstack/react-router";
import { handleApiRequest } from "~/server/api/handler";
import { runtime } from "~/server/runtime";

// JSON API for the iOS app. Everything under /api/v1/ is handled by
// src/server/api/handler.ts, which maps errors to JSON responses itself.
const handle = ({ request }: { request: Request }) => runtime.runPromise(handleApiRequest(request));

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: { GET: handle, POST: handle, PUT: handle, DELETE: handle },
  },
});
