# Family Cookbook app (iOS, iPadOS, web)

Expo app for the new Homer Family Cookbook. It talks to the Worker API in the
repo root; nothing here imports from the site or from `legacy/`.

## Design system

- Tokens: `global.css` (CSS variables used by NativeWind classes) and
  `src/theme/tokens.ts` (the same values for JS: icons, glass tint, shadows).
  Keep them in sync.
- Components: `src/components/ui`, in the react-native-reusables style
  (NativeWind classes, `cva` variants, `cn()` to merge).
- Glass: `Glass` uses Liquid Glass on iOS 26 (`expo-glass-effect`), a blur
  material on older iOS and Android, and `backdrop-filter` on web.

## Commands

```bash
pnpm install            # once, at the repo root (pnpm workspace)
pnpm expo start         # app
pnpm storybook          # component workshop on http://localhost:6006
pnpm build-storybook    # static build in storybook-static/
pnpm typecheck
pnpm expo lint
```

Install Expo packages with `pnpm expo install <pkg>` so versions match the SDK.

## App structure

- Routes: `src/app` (Expo Router). `(tabs)` holds Library, Favorites, Cooking
  and the system Search tab (`expo-router/native-tabs`, Liquid Glass on iOS 26).
  `recipe/[id]` and the `sign-in` sheet sit on the root stack.
- API client: `src/lib/api.ts`, matching `src/server/api/handler.ts` in the
  site. Data fetching uses TanStack Query.
- Sign-in: `src/lib/auth.tsx` trades email and password for a bearer token
  (POST `/api/v1/auth/token`) and keeps it in the iOS Keychain. It's a row in
  the site's `sessions` table, so signing out deletes it there too.

## Running against a local site

```bash
# repo root: local D1 + Worker on http://localhost:5173
pnpm db:migrate:local && pnpm dev
# apps/app
EXPO_PUBLIC_API_URL=http://localhost:5173 pnpm expo start
```

Without `EXPO_PUBLIC_API_URL` the app uses `extra.apiUrl` in `app.json`
(https://homerfamilycookbook.com).

## Development build on your iPhone

Expo Go can't run native features (AlarmKit timers, Live Activities, the
time-sensitive notification entitlement), so those need a development build:
the app with `expo-dev-client`, installed on registered devices.

```bash
cd apps/app
pnpm dlx eas-cli@latest login          # the Expo account that owns the app
pnpm dlx eas-cli@latest init           # once: links the project, adds extra.eas.projectId to app.json
pnpm dlx eas-cli@latest device:create  # once per iPhone or iPad: open the link on the device
pnpm dlx eas-cli@latest build --profile development --platform ios
```

EAS signs in to the Apple account and makes the certificate and provisioning
profile. When the build finishes, open its link on the phone to install, turn
on Settings › Privacy & Security › Developer Mode, then run `pnpm expo start`
and open the project from the app. The `development` profile talks to the
live site; `development-local` points at `http://localhost:5173`.

## TestFlight

Builds go through EAS (`eas.json`). One-time setup by the Apple account owner:
create the app in App Store Connect (bundle id `com.homerfamilycookbook.app`),
add an App Store Connect API key to the Expo account, then:

```bash
pnpm dlx eas-cli build --platform ios --profile preview
pnpm dlx eas-cli submit --platform ios --profile preview --latest
```
