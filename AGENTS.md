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
- pnpm workspace: the site is the root package and the Expo app is `apps/app`. Run `pnpm install` once at the repo root (installs both; one `pnpm-lock.yaml`). Don't use npm or yarn.
- `pnpm dev`, `pnpm test` (vitest inside workerd with a fresh migrated D1), `pnpm typecheck`, `pnpm build`. vitest stays on 5.0.x: 5.1 breaks `@cloudflare/vitest-plugin` here ("Invalid regular expression flags").
- Schema changes are new files in `migrations/` (`NNNN_name.sql`). Never edit an applied migration.
- `pnpm db:migrate:local`. Remote migrations (`pnpm db:migrate:remote`) and `pnpm run deploy` (not `pnpm deploy`, which is a pnpm built-in) use the scoped `HFC_CLOUDFLARE_API_TOKEN`. Agents don't run them unless the task says so.
- Merging to `main` ships automatically (`.github/workflows/deploy.yml`): check, then `db:migrate:remote` if `migrations/` changed, then `deploy` if site files changed (not for `apps/`, `legacy/`, tests or docs alone). It uses the `CLOUDFLARE_API_TOKEN` repo secret. Pull requests run `check.yml` (typecheck, test, build).
- App builds spend Lucas's limited free EAS credits, so nothing builds on merge. Publishing a GitHub release tagged `app-v<version>` (matching `apps/app/app.json`) runs `app-release.yml`: EAS iOS build plus TestFlight submit (pre-release uses the `preview` profile). Dev builds are local on his Mac (`pnpm --filter app ios:device`). PRs touching the app run `app-check.yml`. Don't start EAS builds yourself.

## Rules
- Reading recipes is public. Every write checks that the signed-in user owns the row (or is an admin). Signup is invite-only.
- Never commit secrets, password hashes, or files built from the Postgres backup.
