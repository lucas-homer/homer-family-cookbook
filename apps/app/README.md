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
