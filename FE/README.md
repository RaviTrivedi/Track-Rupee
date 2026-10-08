# TrackRupee Mobile

Android-first Expo application foundation for TrackRupee. The app uses Expo
Router, strict TypeScript, Redux Toolkit, RTK Query, and shared theme/layout
components. This setup intentionally contains no authentication logic, token
storage, or API requests.

## Structure

- `src/app`: Expo Router route groups and screen entry points.
- `src/features`: feature-owned UI and, later, feature state/API endpoints.
- `src/components`: reusable, feature-neutral UI and layout components.
- `src/services`: shared RTK Query API foundation.
- `src/store`: Redux store and typed hooks.
- `src/theme`: shared colors, type, spacing, radii, and INR configuration.
- `src/config`: public runtime configuration.

Routes stay thin while feature code stays together. Shared infrastructure is
kept outside features so future accounts, transactions, categories, and
budgets modules can grow without creating one large global components folder.

## Setup

Use Node.js 22.13 or newer for Expo SDK 57.

```powershell
cd FE
Copy-Item .env.example .env
npm install
npm run android
```

For an Android emulator, `10.0.2.2` in `.env.example` reaches the host
machine. For a physical device, replace it with the development machine's LAN
IP address. Only public configuration belongs in `EXPO_PUBLIC_*` variables.

## Checks

```powershell
npm run typecheck
npm run lint
```
