// Minimal Worker entry for tests; the real entry is TanStack Start's.
export default {
  fetch: () => new Response("test worker"),
} satisfies ExportedHandler<Env>;
