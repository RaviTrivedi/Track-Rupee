# TrackRupee

TrackRupee is an Android-first personal finance tracker for managing accounts, income, expenses, categories, and monthly budgets in INR.

The project is built as a full-stack application with a strict TypeScript Expo mobile client and an Express API backed by PostgreSQL and Prisma.

## Highlights

- JWT authentication with short-lived access tokens and rotating refresh tokens.
- Secure refresh-token storage with hashed tokens and multi-device support.
- Manual INR accounts for cash, bank, and wallet balances.
- User-owned income and expense categories with default category seeding.
- Transaction APIs with atomic account balance updates.
- Monthly category budgets with Asia/Kolkata month boundaries and live spending progress.
- Android-first React Native interface using Expo Router.
- RTK Query data fetching and cache invalidation.
- Shared theme, reusable forms, bottom sheets, validation, and INR formatting.

## Repository structure

```text
TrackRupee/
├── BE/                    # Express, TypeScript, Prisma, PostgreSQL API
│   ├── prisma/            # Schema and migrations
│   ├── src/modules/       # Auth, accounts, categories, transactions, budgets
│   ├── src/middleware/    # Authentication, validation, errors
│   ├── src/utils/         # Responses, errors, async handlers, hashing
│   └── tests/             # Backend regression and integration tests
├── FE/                    # Expo React Native mobile app
│   ├── src/app/           # Expo Router screens and route groups
│   ├── src/features/      # Feature-owned screens, components, and API hooks
│   ├── src/components/    # Shared UI components
│   ├── src/services/      # RTK Query API foundation
│   └── src/theme/         # Colors, typography, spacing, and INR tokens
└── Plan.md               # Product implementation plan
```

## Technology stack

### Backend

- Node.js and Express 5
- TypeScript with strict mode
- PostgreSQL
- Prisma ORM
- Joi validation
- JWT and bcrypt authentication
- Helmet, CORS, Morgan, and rate limiting

### Frontend

- React Native with Expo SDK 57
- Expo Router
- TypeScript
- Redux Toolkit and RTK Query
- Expo SecureStore
- React Native Community DateTimePicker
- Plus Jakarta Sans typography

## Backend setup

Requirements: Node.js 20.19 or newer, PostgreSQL, and npm.

```bash
cd BE
npm ci
cp .env.example .env
```

Configure `BE/.env` with PostgreSQL and JWT values:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/trackrupee"
JWT_ACCESS_SECRET="replace-with-a-long-random-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-secret"
JWT_REFRESH_EXPIRES_IN="30d"
```

Apply migrations, generate Prisma Client, and start the API:

```bash
npm run db:deploy
npm run db:generate
npm run dev
```

The API listens on `http://localhost:4000` by default.

Useful commands:

```bash
npm run typecheck
npm test
npm run db:studio
npm run db:seed
```

## Frontend setup

Requirements: Node.js 20.19.4 or newer and an Android emulator or device.

```bash
cd FE
npm ci
cp .env.example .env
```

Set the API URL in `FE/.env`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api
```

Use your computer’s LAN IP instead of `10.0.2.2` when testing on a physical Android device.

Start the app:

```bash
npm run android
```

Checks:

```bash
npm run typecheck
npm run lint
```

Only public runtime configuration belongs in `EXPO_PUBLIC_*` variables. Never put passwords, JWT secrets, or private keys in the frontend environment.

## API areas

All protected resources derive ownership from the authenticated user. The backend returns a consistent response envelope:

```json
{
  "success": true,
  "message": "Resource retrieved.",
  "data": {}
}
```

Available API areas include:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `/api/accounts`
- `/api/categories`
- `/api/transactions`
- `/api/budgets`

Detailed request and response examples are available in [`BE/docs`](./BE/docs).

## Data and financial behavior

TrackRupee currently supports INR only. Monetary values are sent and returned as decimal strings with up to two decimal places. Transaction creation, editing, and deletion update account balances atomically on the backend. Budget spending is calculated from expense transactions and does not block transactions when a budget is exceeded.

## Project status

TrackRupee is under active development. The core authentication, account, category, transaction, and budget foundations are implemented. Bank integrations, transfers, recurring budgets, notifications, and currency conversion are intentionally outside the current scope.

## License

This project is currently intended as a personal portfolio and learning project. See [`FE/LICENSE`](./FE/LICENSE) for the included license text.
