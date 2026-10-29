This is a Monorepo containing an Expo/React Native mobile application (`apps/mobile`) and a NestJS + Prisma ORM backend (`apps/backend`). Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Monorepo Workspaces

- `apps/mobile`: Expo SDK 58 React Native application (Expo Router, NativeWind).
- `apps/backend`: NestJS 10 REST API with Prisma ORM 5 (Medications, Doses, Health).

## Monorepo Commands

From root:
```bash
npm run mobile          # start mobile Expo dev server
npm run backend:dev     # start NestJS backend in watch mode
npm run prisma:generate # generate Prisma client
npm run prisma:migrate  # sync Prisma schema with database
```

For mobile-specific commands, run inside `apps/mobile`:
```bash
npx expo start          # start the dev server
npx expo lint           # lint
npx tsc --noEmit        # typecheck
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
