# Homer Family Cookbook

Family recipe site on Cloudflare Workers + D1. Being ported from the old Remix/Fly app, which lives in `legacy/` for reference only. Don't edit `legacy/` and don't import from it.

## Stack
- TanStack Start (React 19) on Workers via `@cloudflare/vite-plugin`. Routes are files in `src/routes/`. `src/routeTree.gen.ts` is generated.
- Effect 4 on the server. DB access goes through `SqlClient` from `effect/sql/SqlClient`, backed by `@effect/sql-d1` (`src/server/runtime.ts`). SQL columns are snake_case and results come back camelCase.
- Server functions/loaders call `runServer(effect)` from `src/server/run.ts`, which maps the domain errors in `src/server/errors.ts` to notFound / redirect to /login / 403.
- Who is signed in: `getOptionalUser`, `requireUser` and `requireAdmin` from `src/server/auth/current-user.ts`.
- Keep Effect logic in plain modules that take the `SessionUser` as an argument, and put `createServerFn` wrappers (which call `requireUser`) in separate `*.functions.ts` files. `current-user.ts` imports `@tanstack/react-start/server`, which vitest can't load, so tests import only the plain modules.
- CSRF: TanStack Start's built-in cross-site check for server functions applies only while there is no `src/start.ts`. If you add one, include `createCsrfMiddleware`. Auth functions and POST `/logout` also run their own same-origin check (`src/server/auth/csrf.ts`).
- D1 has no interactive transactions. For multi-statement writes, use `D1Client`'s batch or one statement at a time, ordered so a partial failure is harmless.
- Tailwind v4 (`src/styles/app.css`). Keep the legacy look.
- Validate all user input on the server with Effect `Schema`.

## Commands
- `npm run dev`, `npm test` (vitest inside workerd with a fresh migrated D1), `npm run typecheck`, `npm run build`.
- Schema changes are new files in `migrations/` (`NNNN_name.sql`). Never edit an applied migration.
- `npm run db:migrate:local`. Remote migrations and `npm run deploy` use the scoped `HFC_CLOUDFLARE_API_TOKEN`. Agents don't run them unless the task says so.

## Rules
- Reading recipes is public. Every write checks that the signed-in user owns the row (or is an admin). Signup is invite-only.
- Never commit secrets, password hashes, or files built from the Postgres backup.
