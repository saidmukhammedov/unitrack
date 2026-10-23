# UniTrack — Architecture Document

**Version:** 1.0.0  
**Date:** 2026-10-22  
**Status:** Approved for Phase 1 Implementation

---

## 1. Overview

UniTrack is a monorepo containing three applications and five shared packages. A single PostgreSQL database is authoritative. All clients communicate with the backend exclusively through a versioned REST API.

```
┌─────────────────────────────────────────────────────────────────┐
│                        UniTrack Monorepo                        │
│                                                                 │
│  apps/web          apps/mobile         apps/api                 │
│  (React + Vite)    (React Native)      (Node.js + Express)      │
│       │                  │                    │                 │
│       └──────────────────┴────────────────────┘                 │
│                          │                                      │
│              packages/contracts   (Zod schemas, types)          │
│              packages/academic-core (grade calculations)        │
│              packages/api-client  (typed HTTP client)           │
│              packages/i18n        (translations, formatters)    │
│              packages/config      (shared ESLint, TS config)    │
└─────────────────────────────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    └─────────────┘
```

---

## 2. Monorepo Structure

```
UniTrack/
├── apps/
│   ├── web/                  # React + Vite web application
│   ├── mobile/               # React Native + Expo application
│   └── api/                  # Node.js + Express REST API
│       └── prisma/           # Prisma schema and migrations
├── packages/
│   ├── contracts/            # Shared Zod schemas and TypeScript types
│   ├── academic-core/        # Grading and calculation logic (no I/O)
│   ├── api-client/           # Typed HTTP client wrapping fetch/axios
│   ├── i18n/                 # Translation resources and i18n utilities
│   └── config/               # Shared tsconfig, eslint, prettier configs
├── docs/                     # Project documentation
├── .env.example
├── package.json              # Workspace root
└── README.md
```

### 2.1 Workspace Manager Decision

**Decision: pnpm workspaces**

| Criterion | pnpm | npm workspaces |
|-----------|------|----------------|
| Disk usage | Efficient (content-addressed store) | Duplicates packages |
| Strict isolation | Yes (phantom-dependency prevention) | No |
| Performance | Faster installs | Slower |
| Expo compatibility | Verified compatible | Verified compatible |
| Ecosystem maturity | High | High |

pnpm is preferred. The workspace root `package.json` declares all workspaces (`["apps/*", "packages/*"]`). Each package is individually versioned but packages are never published to npm in the MVP.

**Package Naming Convention — [D-06]:** All workspaces use the `@unitrack/` npm scope to ensure clear dependency resolution, clean import specifiers, and unambiguous `--filter` command targeting:
- `apps/api` → `@unitrack/api`
- `apps/web` → `@unitrack/web`
- `apps/mobile` → `@unitrack/mobile`
- `packages/contracts` → `@unitrack/contracts`
- `packages/academic-core` → `@unitrack/academic-core`
- `packages/api-client` → `@unitrack/api-client`
- `packages/i18n` → `@unitrack/i18n`
- `packages/config` → `@unitrack/config`

> **Mobile Build & Testing Matrix on Windows [D-07 / A-04]:**
> - **Local Workstation (Windows):** Android Studio Emulator and local Metro bundler are used for day-to-day development and Phase 2 local gate verification. Expo development client (`@unitrack/mobile`) is built and run locally for Android. Local iOS simulator execution is not possible on Windows (requires macOS/Xcode).
> - **iOS Cloud & CI Verification:** iOS compilation and native dependency linkage are verified via **EAS Cloud Build** (`eas build --platform ios --profile development`) or macOS CI runners (e.g. GitHub Actions `macos-latest`). Physical iOS device testing is conducted via Expo Development Client / TestFlight.
> - **Metro & pnpm Monorepo Config:** `metro.config.js` is configured with `watchFolders` pointing to `packages/` and `nodeModulesPaths`. Root `.npmrc` sets `node-linker=hoisted` (or `shamefully-hoist=true`) to guarantee React Native autolinking compatibility.

---

## 3. Application Architecture

### 3.1 Web Application (`apps/web`)

| Concern | Technology | Notes |
|---------|-----------|-------|
| Build tool | Vite | Fast HMR; ESM-native |
| Framework | React 18+ | Functional components, hooks |
| Language | TypeScript (strict) | |
| Routing | React Router v6 | Client-side routing |
| Server state | TanStack Query v5 | Cache, sync, pagination |
| Client state | React Context + `useReducer` | Minimal global state; forms use local state |
| Styling | CSS Modules or Tailwind CSS | Decision deferred to Phase 4; document in Phase 2 |
| Forms | React Hook Form + Zod | Schema-driven validation from `packages/contracts` |
| i18n | `react-i18next` | Resources from `packages/i18n` |
| Auth storage | `httpOnly` cookies (refresh token) + memory (access token) | Prevents XSS token theft |
| API layer | `packages/api-client` | Centralized request logic |

**Web architecture pattern:** Feature-based folder structure.

```
apps/web/src/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── periods/
│   ├── subjects/
│   ├── timetable/
│   ├── tasks/
│   ├── assessments/
│   ├── grades/
│   └── settings/
├── components/       # Shared UI primitives (Button, Input, Modal)
├── hooks/            # Shared custom hooks
├── lib/              # Utilities, date helpers
└── main.tsx
```

### 3.2 Mobile Application (`apps/mobile`)

| Concern | Technology | Notes |
|---------|-----------|-------|
| Framework | React Native + Expo SDK | Managed workflow |
| Language | TypeScript (strict) | |
| Navigation | Expo Router (file-based) | Built on React Navigation |
| Server state | TanStack Query v5 | Same patterns as web |
| Client state | React Context | |
| Forms | React Hook Form + Zod | Same contracts as web |
| i18n | `react-i18next` | Same resources from `packages/i18n` |
| Push notifications | Expo Push Notifications | See §3.5 |
| Auth storage | Expo SecureStore | Refresh token stored securely |
| API layer | `packages/api-client` | Same client as web |

**Mobile architecture pattern:** Tab-based navigation with stack navigation per tab. Matches web feature boundaries.

```
apps/mobile/
├── app/                # Expo Router file-based routes
│   ├── (auth)/         # Login, register, verify email
│   ├── (tabs)/         # Dashboard, Subjects, Tasks, Grades, Settings
│   └── _layout.tsx
├── components/         # Mobile-specific UI components
├── hooks/
└── lib/
```

> **Decision:** Web and mobile do **not** share UI components. Shared logic lives in `packages/academic-core`, `packages/api-client`, and `packages/i18n`. Attempting to share React components across React DOM and React Native creates incompatible APIs and build complexity that outweighs any benefit at this scale.

### 3.3 Backend API (`apps/api`)

| Concern | Technology | Notes |
|---------|-----------|-------|
| Runtime | Node.js 20 LTS | |
| Framework | Express 5 | |
| Language | TypeScript (strict) | |
| ORM | Prisma | Schema at `apps/api/prisma/schema.prisma` |
| Validation | Zod | Contracts from `packages/contracts` |
| Auth | JWT (access) + refresh token in DB | See §auth |
| Password hashing | argon2 | Preferred over bcrypt; see §security |
| Rate limiting | `express-rate-limit` | Per-route configuration |
| Logging | `pino` | Structured JSON logs |
| Environment | `dotenv` + validated with Zod | Fail-fast on missing required env vars |

**Backend layer structure:**

```
apps/api/src/
├── routes/             # Route definitions (auth, periods, subjects…)
├── controllers/        # Request handlers
├── services/           # Business logic
├── middleware/         # Auth, error handling, rate limiting
├── lib/                # Prisma client, mailer, push client
└── index.ts
apps/api/prisma/        # Prisma schema + migrations (root sibling of src) [I-17]
```

**API versioning:** All routes are prefixed with `/api/v1`. Future breaking changes increment to `/api/v2`. Clients declare the API version they target.

### 3.4 Shared Packages

#### `packages/contracts`
- Zod schemas for all API request bodies and response shapes.
- TypeScript types inferred from schemas (`z.infer<typeof XxxSchema>`).
- No Node.js-specific or browser-specific imports.
- Both backend (validation) and frontend (form validation, typing) import from this package.

#### `packages/academic-core`
- Pure TypeScript functions for grade calculation.
- No database access, no HTTP calls, no side effects.
- Depends only on `packages/contracts` for shared types.
- Fully unit-testable in isolation.
- Both backend (authoritative calculation) and frontend (optimistic preview) can import this.

#### `packages/api-client`
- Typed HTTP client built on `fetch`.
- One function per API endpoint, returning typed response objects.
- Handles token attachment, token refresh retry, and serialization.
- Used by both `apps/web` and `apps/mobile`.
- **Platform adapter [I-06]:** Accepts a configuration parameter `{ platform: 'web' | 'mobile', storageAdapter?: TokenStorageAdapter }`.
  - When `platform === 'mobile'`, automatically attaches `X-Client-Type: mobile` to auth requests, extracts `refreshToken` from login/auth responses into Expo SecureStore via `storageAdapter`, and supplies `{ refreshToken }` in the JSON body of `POST /api/v1/auth/refresh`.
  - When `platform === 'web'`, omits `X-Client-Type` (or sends `'web'`), relies on `httpOnly` cookies sent automatically with `credentials: 'include'`, and sends an empty body on `POST /api/v1/auth/refresh`.

#### `packages/i18n`
- Translation resource files (`en.json`, `uz.json`, `ru.json`).
- Shared formatter utilities for dates, times, and numbers using `Intl`.
- Does **not** include React-specific code; i18next initialization is per-app.

#### `packages/config`
- `tsconfig.base.json` extended by each app and package.
- Shared ESLint config.
- Shared Prettier config.

---

## 4. Data Flow

### 4.1 Read Flow

```
Client
  → api-client: GET /api/v1/subjects
  → Express route handler
  → Auth middleware (verify JWT)
  → Controller
  → Service (Prisma query scoped to req.user.id)
  → JSON response
  → TanStack Query cache
  → React component render
```

### 4.2 Write Flow

```
Client form submission
  → React Hook Form + Zod validation (contracts)
  → api-client: POST /api/v1/tasks
  → Express route handler
  → Auth middleware
  → Request body validated with Zod (contracts)
  → Controller → Service → Prisma mutation
  → JSON response (201 Created)
  → TanStack Query: invalidate relevant cache keys
  → UI re-renders from fresh data
```

### 4.3 Error Flow

```
Network failure or server error
  → api-client catches error
  → TanStack Query surfaces error state
  → Component renders error UI (localized message)
  → Form values preserved (not cleared)
  → User may retry; idempotency key or safe retry documented per endpoint
```

---

## 5. Authentication Architecture

See `docs/api-specification.md §2` for endpoint contracts.

**Summary:**

```
┌──────────┐   POST /auth/login (or /auth/google)   ┌─────────┐
│  Client  │ ─────────────────────────────────────▶ │   API   │
│          │ ◀───────────────────────────────────── │         │
│          │  access_token (JWT in JSON body)       │         │
│          │  Web: refresh_token in httpOnly cookie │         │
│          │  Mobile: refresh_token in JSON body    └─────────┘
│          │          (when X-Client-Type: mobile)
│  On 401  │
│  or exp  │   POST /auth/refresh
│          │ ─────────────────────────────────────▶   API
│          │  Web: empty body, cookie attached      │
│          │  Mobile: { refreshToken } in body      │
│          │ ◀─────────────────────────────────────
│          │  new access_token (and rotated refresh token)
└──────────┘
```

- **Access token:** JWT, 15-minute expiry, stored in memory (web) or memory (mobile).
- **Refresh token storage & rotation [I-06]:**
  - **Web:** Received and stored as an `httpOnly`, `Secure`, `SameSite=Strict` cookie (`Path=/api/v1/auth`). The web SPA never reads the raw refresh token. `POST /api/v1/auth/refresh` is sent with `credentials: 'include'` and an empty JSON body.
  - **Mobile:** Mobile client sends header `X-Client-Type: mobile` on auth endpoints (`/login`, `/register`, `/google`). The backend returns `{ "refreshToken": "<opaque_token>" }` in the response payload. The mobile client securely persists this in `expo-secure-store` and supplies it in `{ "refreshToken": "<token>" }` in the request body for `POST /api/v1/auth/refresh`.
  - On every refresh, the existing session is revoked and a new refresh token is issued (token rotation).
- **Google OAuth / OpenID Connect [D-05 / I-07]:**
  - **Web flow:** Web SPA uses the Google Identity Services JavaScript SDK (One Tap / Sign In With Google button) to authenticate the user and obtain an `idToken` in the browser. The SPA POSTs `{ "idToken": "..." }` via an in-app XMLHttpRequest/fetch directly to `POST /api/v1/auth/google`. **No server-side browser redirect is used.** Because the request is a direct same-origin/CORS AJAX POST and not a top-level cross-site redirect from Google, `SameSite=Strict` refresh cookies are set seamlessly by the browser without being blocked.
  - **Mobile flow:** Mobile app uses `expo-auth-session` / Google Sign-In SDK to acquire the Google `idToken`, sending it with `X-Client-Type: mobile` to `POST /api/v1/auth/google`.
  - **Backend validation:** Backend verifies the `idToken` cryptographically using Google's public keys via `google-auth-library` (verifying signature, `iss` in `accounts.google.com` / `https://accounts.google.com`, `aud` matching server `GOOGLE_CLIENT_ID`, and expiration). The user is identified solely by the verified `sub` claim. Client-supplied raw email is never trusted as identity proof. Account auto-merging based on matching email is explicitly forbidden.

---

## 6. Push Notification Architecture

```
Mobile app → Expo SDK → expo-notifications
  → User grants permission
  → Expo push token obtained
  → Client: POST /api/v1/devices (register token)
  → API stores token in Device table

Scheduled job (server-side cron)
  → Query upcoming tasks/assessments within reminder windows
  → Send via Expo Push Notifications API
  → Record delivery in NotificationDelivery table
  → Handle failed tokens (remove Device record)
```

---

## 7. Environment Configuration

Each application reads from environment variables validated at startup.

**Backend required variables:**
```
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET        # (or use asymmetric keys — decision in Phase 3)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
EXPO_ACCESS_TOKEN
APP_BASE_URL
CORS_ORIGINS
NODE_ENV
```

**Client variables (web, public):**
```
VITE_API_BASE_URL
VITE_GOOGLE_CLIENT_ID
```

> **Rule:** No database credentials or server secrets may appear in web or mobile client bundles. The `VITE_` prefix exposes variables; only non-sensitive values are permitted there.

---

## 8. Deployment Architecture (MVP)

> Specific cloud provider is not prescribed. The following is a reference topology.

```
                        ┌──────────────┐
                        │   CDN/Edge   │
                        │  (Web SPA)   │
                        └──────┬───────┘
                               │
                ┌──────────────▼──────────────┐
                │       Load Balancer         │
                └──────────────┬──────────────┘
                               │
              ┌────────────────▼───────────────┐
              │         API Server(s)           │
              │    (Node.js + Express)          │
              └────────────────┬───────────────┘
                               │
                ┌──────────────▼──────────────┐
                │         PostgreSQL           │
                │      (Primary + Replica)     │
                └─────────────────────────────┘
```

- Web SPA deployed as static files to a CDN.
- API deployed as a containerized Node.js service.
- Mobile apps distributed via App Store and Google Play.
- Database: managed PostgreSQL (e.g., Supabase, Railway, Neon, or AWS RDS).

---

## 9. Architectural Decision Log

| ID | Decision | Rationale | Date |
|----|----------|-----------|------|
| ADR-01 | pnpm workspaces over npm workspaces | Performance, strict isolation, phantom-dependency prevention | 2026-10-22 |
| ADR-02 | No shared UI components between web and mobile | Incompatible rendering APIs; maintenance overhead exceeds benefit | 2026-10-22 |
| ADR-03 | Access tokens in memory, refresh tokens in httpOnly cookie / SecureStore | Prevents XSS token theft on web; prevents token exposure in mobile storage | 2026-10-22 |
| ADR-04 | Authoritative grade calculation in `packages/academic-core` | Ensures web, mobile, and backend all use identical formulas | 2026-10-22 |
| ADR-05 | Backend validates Google ID token server-side | Client-supplied email alone is not proof of identity | 2026-10-22 |
| ADR-06 | Prisma schema lives in `apps/api/prisma/` | Prisma is a backend concern; shared packages must not depend on it | 2026-10-22 |
| ADR-07 | TanStack Query for server state on both web and mobile | Consistent cache invalidation patterns; avoids redundant global state | 2026-10-22 |
| ADR-08 | argon2 for password hashing | Superior memory-hardness over bcrypt | 2026-10-22 |

---

## 10. Open Questions and Risks

| # | Item | Impact | Proposed Resolution |
|---|------|--------|-------------------|
| ARCH-R1 | Expo managed workflow limitations for background tasks | Push scheduling may need server-side cron | Use server-side cron (node-cron or pg_cron) for notification dispatch |
| ARCH-R2 | Expo Metro bundler monorepo symlink resolution | Mobile build may fail without correct config | Address explicitly in Phase 2; follow Expo monorepo documentation |
| ARCH-R3 | pnpm + Expo peer dependency conflicts | Install may fail for some native modules | Validate in Phase 2 before proceeding; fall back to npm workspaces only if irreconcilable |
| ARCH-R4 | CSS strategy not finalized for web | Affects design consistency | Choose between CSS Modules and Tailwind in Phase 2; document the decision |
| ARCH-R5 | JWT signing strategy (symmetric vs asymmetric) | Security surface | Evaluate in Phase 3; default to HS256 with strong secret for MVP, RS256 if API is ever third-party consumed |
