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
npm install
npx expo start          # app
npm run storybook       # component workshop on http://localhost:6006
npm run build-storybook # static build in storybook-static/
npm run typecheck
npx expo lint
```

Install Expo packages with `npx expo install <pkg>` so versions match the SDK.

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
npm run db:migrate:local && npm run dev
# apps/app
EXPO_PUBLIC_API_URL=http://localhost:5173 npx expo start
```

Without `EXPO_PUBLIC_API_URL` the app uses `extra.apiUrl` in `app.json`
(https://homerfamilycookbook.com).

## TestFlight

Builds go through EAS (`eas.json`). One-time setup by the Apple account owner:
create the app in App Store Connect (bundle id `com.homerfamilycookbook.app`),
add an App Store Connect API key to the Expo account, then:

```bash
npx eas-cli build --platform ios --profile preview
npx eas-cli submit --platform ios --profile preview --latest
```
