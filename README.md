# UniTrack — README

**UniTrack** is a cross-platform academic planner for school and university students. It centralises timetables, assignments, assessments, and grades in a single application synchronized across web, Android, and iOS.

> **Status:** Phase 7 — Testing, Deployment, and Release Preparation complete. All 99 automated unit and integration tests passing. Single-instance deployment architecture verified. Stopped at the Phase 7 release approval gate.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Technology Stack](#technology-stack)
- [Documentation](#documentation)
- [Development Setup](#development-setup)
- [Environment Variables & Secret Catalog](#environment-variables--secret-catalog)
- [Running the Apps](#running-the-apps)
- [Database & Migrations](#database--migrations)
- [Testing](#testing)
- [Deployment & Operations](#deployment--operations)
  - [Single-Instance Architecture Constraint](#single-instance-architecture-constraint)
  - [Containerized API Deployment (Docker)](#containerized-api-deployment-docker)
  - [Static Web App Deployment (Vercel / CDN)](#static-web-app-deployment-vercel--cdn)
  - [Mobile Builds (Expo & EAS)](#mobile-builds-expo--eas)
  - [Rollback Procedures](#rollback-procedures)
- [Known Limitations & Verification Boundaries](#known-limitations--verification-boundaries)
- [Contributing](#contributing)

---

## Project Overview

| Platform | Technology |
|----------|-----------|
| Web | React + Vite + TypeScript |
| Android & iOS | React Native + Expo + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma |

**Languages supported:** English, Uzbek (Latin), Russian

---

## Repository Structure

```
UniTrack/
├── apps/
│   ├── web/          # React + Vite web application
│   ├── mobile/       # React Native + Expo mobile application
│   └── api/          # Node.js + Express REST API
│       └── prisma/   # Prisma schema and database migrations
├── packages/
│   ├── contracts/    # Shared Zod schemas and TypeScript types
│   ├── academic-core/# Grade calculation logic (pure TypeScript)
│   ├── api-client/   # Typed HTTP client for web and mobile
│   ├── i18n/         # Translation resources (en, uz, ru) and formatters
│   └── config/       # Shared TypeScript, ESLint, Prettier config
└── docs/             # Project documentation
```

---

## Technology Stack

| Concern | Choice |
|---------|--------|
| Package manager | pnpm workspaces |
| Type system | TypeScript (strict) |
| API | REST under `/api/v1` |
| ORM | Prisma |
| Validation | Zod (shared via `packages/contracts`) |
| Server state | TanStack Query v5 |
| Forms | React Hook Form |
| i18n | react-i18next |
| Auth | JWT (access) + rotating refresh tokens |
| Password hashing | argon2 |
| Push notifications | Expo Push Notifications |

---

## Documentation

All planning documents are in `docs/`:

| Document | Description |
|----------|-------------|
| [Product Requirements](docs/product-requirements.md) | MVP features, user stories, acceptance criteria |
| [Architecture](docs/architecture.md) | Monorepo structure, platform decisions, ADRs |
| [Database Design](docs/database-design.md) | Schema, tables, indexes, cascade rules |
| [API Specification](docs/api-specification.md) | REST endpoints, request/response schemas |
| [Grading Rules](docs/grading-rules.md) | Grade calculation formulas and examples |
| [Localization](docs/localization.md) | i18n strategy, locale coverage, formatting |
| [Implementation Roadmap](docs/implementation-roadmap.md) | 7-phase plan with deliverables and acceptance criteria |

---

## Development Setup

> **Prerequisites:** Node.js 20+, pnpm 9+, PostgreSQL 15+

### 1. Clone the repository

```bash
git clone https://github.com/your-org/unitrack.git
cd unitrack
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example apps/api/.env
# Edit apps/api/.env with your values
```

See [Environment Variables](#environment-variables) below.

### 4. Run database migrations

```bash
pnpm --filter @unitrack/api exec prisma migrate dev
```

### 5. Start development servers

```bash
# API
pnpm --filter @unitrack/api dev

# Web (in a new terminal)
pnpm --filter @unitrack/web dev

# Mobile (in a new terminal)
pnpm --filter @unitrack/mobile start
```

---

## Environment Variables

### `apps/api/.env`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/unitrack

# JWT
JWT_ACCESS_SECRET=your-access-token-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (SMTP)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@unitrack.app

# Expo Push Notifications
EXPO_ACCESS_TOKEN=your-expo-access-token

# Application
APP_BASE_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:5173
NODE_ENV=development
PORT=3000
```

### `apps/web/.env`

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

> **Security:** Never put database credentials or server secrets in `VITE_*` variables. They are exposed in the client bundle.

---

## Running the Apps

### API

```bash
pnpm --filter @unitrack/api dev         # Development with hot-reload
pnpm --filter @unitrack/api build       # Production build
pnpm --filter @unitrack/api start       # Start production build
```

Health check: `GET http://localhost:3000/api/v1/health`

### Web

```bash
pnpm --filter @unitrack/web dev         # Development server (http://localhost:5173)
pnpm --filter @unitrack/web build       # Production build
pnpm --filter @unitrack/web preview     # Preview production build
```

### Mobile

```bash
pnpm --filter @unitrack/mobile start    # Start Expo Metro bundler
pnpm --filter @unitrack/mobile android  # Run on Android emulator (Windows / macOS / Linux)
pnpm --filter @unitrack/mobile ios      # Run on iOS simulator (requires macOS) or use EAS cloud build
```

---

## Database

Prisma schema: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma)

```bash
# Run all pending migrations (development)
pnpm --filter @unitrack/api exec prisma migrate dev

# Run migrations in production (no schema push)
pnpm --filter @unitrack/api exec prisma migrate deploy

# Open Prisma Studio (database browser)
pnpm --filter @unitrack/api exec prisma studio

# Regenerate Prisma client after schema changes
pnpm --filter @unitrack/api exec prisma generate
```

---

## Testing

```bash
# Run all tests (99 passing tests)
pnpm test

# Unit tests only (packages/academic-core: 27 pure unit tests)
pnpm --filter @unitrack/academic-core test

# API integration tests (apps/api: 72 Supertest integration tests)
pnpm --filter @unitrack/api test

# Type-check all packages (0 TypeScript errors)
pnpm typecheck

# Lint all packages
pnpm lint

# Production build across all workspace projects
pnpm build
```

---

## Deployment & Operations

### Single-Instance Architecture Constraint

> [!IMPORTANT]
> **Mandatory Single-Instance Rule for Initial Production Deployments**
> The current production build is architected for **single-container / single-instance** deployment (e.g. 1 Cloud Run container instance with min=1/max=1, or 1 Railway/Render service):
> 1. **Idempotency Key Deduplication:** Handled via an in-memory LRU cache with 24-hour TTL. In a multi-instance cluster without distributed shared state, retries routed to different containers would not hit the same memory space.
> 2. **Notification Scheduling:** Executed via an in-process, recurring 60-second timer (`setInterval`) guarded by an atomic memory mutex. Running multiple concurrent API processes would cause duplicate cron iterations polling the database concurrently.
> 
> *To scale horizontally across multiple instances in future milestones: replace the in-memory cache with Redis or PostgreSQL idempotency records, and orchestrate scheduling via Cloud Scheduler, BullMQ, or PgBoss.*

### Containerized API Deployment (Docker)

A multi-stage Alpine Dockerfile is located at the root of the repository:

```bash
# Build the production Docker image
docker build -t unitrack-api:latest .

# Run the container locally with environment configuration
docker run -d \
  --name unitrack-api \
  -p 4000:4000 \
  --env-file apps/api/.env \
  unitrack-api:latest
```

The container automatically executes `prisma migrate deploy` on startup prior to spawning the Node.js API server.

### Static Web App Deployment (Vercel / CDN)

The web application compiles to static HTML/JS/CSS assets in `apps/web/dist`:

```bash
pnpm --filter @unitrack/web build
```

- Deploy to Vercel, Netlify, or Cloudflare Pages.
- A `vercel.json` SPA rewrite rule is provided to redirect all virtual routes to `/index.html`.
- Set `VITE_API_BASE_URL` in the hosting provider dashboard.

### Mobile Builds (Expo & EAS)

The mobile client is packaged using Expo Metro & EAS Build:

```bash
# Verify JavaScript Hermès bundling for Android & iOS locally
cd apps/mobile
npx expo export --platform android
npx expo export --platform ios

# Trigger EAS Cloud Builds (requires Expo account & developer credentials)
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
```

### Rollback Procedures

1. **API Container Rollback:**
   - In container platforms (Cloud Run, Railway, Render), redeploy the previous immutable image digest or revision tag.
   - Database migrations in UniTrack are strictly additive (new tables, indexes, and non-destructive constraints). No tables or columns are dropped in minor releases, allowing safe backward compatibility with the previous container image.
2. **Database Migration Rollback:**
   - If a migration failure occurs, inspect `prisma migrate status`.
   - Revert via manual SQL scripts or re-apply after fixing migration files. Never edit applied migration files in production without resolving via `prisma migrate resolve`.
3. **Web Rollback:**
   - Instantly roll back to the prior deployment deployment SHA via the Vercel/Netlify hosting dashboard.

---

## Known Limitations & Verification Boundaries

1. **Automated Bundle vs. Physical Device Testing:**
   - Both Android and iOS JavaScript bundles compile cleanly to Hermès bytecode (`index-*.hbc`).
   - Device testing on physical Android and iOS hardware, as well as EAS Cloud builds, requires active developer accounts (Apple Developer Program, Google Play Console, Expo EAS).
2. **Physical Push Delivery Verification:**
   - Push delivery dispatch has been verified against the Expo Push API specifications, ticket responses, and error handling (`DeviceNotRegistered`).
   - Physical delivery and lock screen display can only be verified on a registered physical phone with push permissions granted.

---

## Contributing

1. Read the docs in `docs/` before starting work.
2. Follow the [Implementation Roadmap](docs/implementation-roadmap.md) — do not skip phases.
3. Every PR must pass `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
4. All user-visible strings must use i18n keys. No hard-coded UI text.
5. Do not expose secrets in environment variables prefixed with `VITE_`.
6. Do not write grading logic outside `packages/academic-core`.

---

## License

TBD — private repository during development.
