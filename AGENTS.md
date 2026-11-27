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

## Rules
- Reading recipes is public. Every write checks that the signed-in user owns the row (or is an admin). Signup is invite-only.
- Never commit secrets, password hashes, or files built from the Postgres backup.

## Testing the app in the iOS Simulator
Everything runs locally on the Mac. Expo is on the free tier: don't use EAS cloud builds for this.

- Two simulators, iOS 27.0: **HFC iPhone** (iPhone 17 Pro) and **HFC iPad** (iPad Pro 13-inch M5). `apps/app/e2e/sim.sh` finds them by name and recreates them if they're gone. Don't use the ROSTR simulators.
- Ports: site `pnpm dev` on 5173, Metro on 8091 (ROSTR Metros use 8096-8098).
- One-time or after a native change (new native package, `app.json` plugins): `apps/app/e2e/sim.sh build`. It runs `expo run:ios` locally (prebuild into the gitignored `apps/app/ios/`) and installs the same build on both simulators.
- Each session:
  1. Repo root: `pnpm db:migrate:local && pnpm dev --port 5173 --strictPort` (background).
  2. `apps/app/e2e/sim.sh metro` (background). `metro live` points the app at homerfamilycookbook.com instead.
  3. `apps/app/e2e/sim.sh open` loads the app on both simulators (a small Maestro flow that also accepts iOS's "Open in Family Cookbook?" prompt and the dev menu sheet).
- Look and tap: `e2e/sim.sh shot iphone|ipad [file]` for a screenshot (read the PNG). The iOS Simulator MCP tool (`control`: attach/screenshot/tap/swipe/text) works too, in device points. For anything longer, write a Maestro flow instead of chains of taps.
- E2E: Maestro flows in `apps/app/e2e/flows` (shared steps in `e2e/subflows`). `e2e/sim.sh test [iphone|ipad|all] [flow.yaml]` signs in as the test user. Maestro matches visible text and accessibility labels (`tapOn: "Sign in"`); add `testID` only where text is ambiguous. Screenshots from `takeScreenshot` land in `~/.maestro/tests/<run>/`. The first run on a fresh simulator can fail while the XCTest driver starts: run it again. Maestro's logs in `~/.maestro/tests/` include typed text, so the test password ends up there: never attach those logs or paste them anywhere.
- Test account: `claude-e2e@homerfamilycookbook.test`, MEMBER. The password lives only in the macOS Keychain (services `hfc-e2e-local` and `hfc-e2e-live`); `node scripts/e2e/test-user.mjs show local --password` prints it. `node scripts/e2e/test-user.mjs create local --reset` recreates the local one through the invite flow.
- Default to the local site: it's a copy of the live recipes in the local D1, so flows may write (favorites, notes, timers, photos). Against live (`metro live`, `HFC_TARGET=live`), only read and sign in. Anything that writes to the live database needs Lucas's OK first.
