# UniTrack — Implementation Roadmap

**Version:** 1.0.0  
**Date:** 2026-10-22  
**Status:** Approved

---

## Overview

Development is divided into 7 phases. Each phase has clear deliverables, acceptance criteria, and dependencies. No phase may begin until its predecessors are accepted.

Mobile build validation happens in Phase 2 (not deferred to the end). The first release ships web, Android, and iOS simultaneously.

---

## Phase 1 — Requirements, Design, and Technical Documentation

**Status:** ✅ Completing now

### Deliverables
- [x] `docs/product-requirements.md`
- [x] `docs/architecture.md`
- [x] `docs/database-design.md`
- [x] `docs/api-specification.md`
- [x] `docs/grading-rules.md`
- [x] `docs/localization.md`
- [x] `docs/implementation-roadmap.md`
- [x] `README.md`

### Acceptance Criteria
- All 8 documents created and internally consistent.
- Open questions documented with proposed defaults.
- No application code written.
- Stakeholder/team review complete and documents approved.

### Risks
- Documents may require revision after Phase 2 discoveries (e.g., Expo monorepo issues). Update documents before diverging from them.

---

## Phase 2 — Monorepo and Database Foundation

**Depends on:** Phase 1 approved

### Deliverables

**Monorepo scaffolding:**
- [ ] pnpm workspace root with `apps/` and `packages/` structure (`pnpm-workspace.yaml`)
- [ ] Root `package.json` with `@unitrack/*` scoped workspaces and recursive scripts (`build`, `lint`, `typecheck`, `test`) [I-10, I-11]
- [ ] Root `.npmrc` configured with `node-linker=hoisted` or `shamefully-hoist=true` for React Native monorepo compatibility
- [ ] `packages/config`: shared `tsconfig.base.json`, ESLint, Prettier
- [ ] `packages/contracts`: `@unitrack/contracts` placeholder with example Zod schema
- [ ] `packages/academic-core`: `@unitrack/academic-core` TypeScript package shell, no logic yet
- [ ] `packages/api-client`: `@unitrack/api-client` TypeScript package shell with platform adapter interface
- [ ] `packages/i18n`: `@unitrack/i18n` locale file structure with placeholder strings
- [ ] `apps/api`: `@unitrack/api` Express + TypeScript bootstrapped, health check endpoint
- [ ] `apps/web`: `@unitrack/web` Vite + React + TypeScript bootstrapped, renders "Hello"
- [ ] `apps/mobile`: `@unitrack/mobile` Expo + React Native + TypeScript bootstrapped with EAS build profile and local Android development client configuration

**Database:**
- [ ] PostgreSQL connection configured via `DATABASE_URL`
- [ ] Prisma schema (`apps/api/prisma/schema.prisma`) matching `docs/database-design.md` (all 14 tables with `periodId` on `ClassSession` & `Assessment` backed by compound foreign keys `Subject(id, periodId)`, and unconstrained append-only `CourseGrade`)
- [ ] Initial migration generated and applied
- [ ] Prisma client generated and usable in `@unitrack/api`

**Tooling:**
- [ ] CI pipeline: lint, type-check, build all apps and packages
- [ ] Environment variable validation (Zod) at `@unitrack/api` startup
- [ ] `.env.example` with all required variables documented

### Acceptance Criteria
- `pnpm install` succeeds from the monorepo root
- `pnpm build` succeeds for all apps and packages with zero TypeScript errors
- `pnpm --filter @unitrack/api dev` starts the API server and `/api/v1/health` returns `200`
- **Mobile Development Build Verification [D-07 / A-04]:**
  - **Local Workstation (Windows):** Expo development build (not Expo Go) launches `@unitrack/mobile` successfully on local Android Studio emulator, validating Metro monorepo symlinks and contracts imports.
  - **iOS Platform Verification:** EAS Cloud Build (`eas build --platform ios --profile development`) configuration verified and successfully compiles the iOS binary in the cloud (or via macOS CI runner); physical device testing executed via development client / TestFlight where Apple Developer credentials are provided. Local iOS Simulator is not required on Windows host.
- Prisma migration runs against a local PostgreSQL instance with no errors
- All 14 tables exist with correct columns, compound foreign keys, and constraints confirmed by `psql \d`

### Risks

| Risk | Mitigation |
|------|-----------|
| Expo + pnpm monorepo Metro config errors | Follow Expo monorepo documentation; add `metro.config.js` with `watchFolders` pointing to `packages/` |
| Expo managed workflow vs bare workflow | Start with managed workflow; eject only if a required native module demands it |
| pnpm phantom dependency issues with Expo | Test `react-native` resolution early; use `pnpm.peerDependencyRules` if needed |

---

## Phase 3 — Authentication and Account Security

**Depends on:** Phase 2 accepted

### Deliverables

**Backend:**
- [ ] `POST /api/v1/auth/register` — email/password registration
- [ ] Email verification token generation and email send (SMTP)
- [ ] `POST /api/v1/auth/verify-email`
- [ ] `POST /api/v1/auth/login` — email/password login
- [ ] JWT access token generation (15-min expiry)
- [ ] Refresh token generation, storage (hashed), and cookie/SecureStore strategy
- [ ] `POST /api/v1/auth/refresh` — token rotation
- [ ] `POST /api/v1/auth/logout` — session revocation
- [ ] `POST /api/v1/auth/forgot-password` — password reset email
- [ ] `POST /api/v1/auth/reset-password`
- [ ] `GET /api/v1/auth/sessions` and `DELETE /api/v1/auth/sessions/:id`
- [ ] `POST /api/v1/auth/google` — Google ID token validation (not just email trust)
- [ ] `GET /api/v1/users/me`, `PATCH /api/v1/users/me`, `DELETE /api/v1/users/me`
- [ ] `POST /api/v1/users/me/change-password`
- [ ] Auth middleware (JWT verification, user injection into request)
- [ ] Ownership middleware helper
- [ ] Rate limiting on all auth endpoints
- [ ] argon2 password hashing
- [ ] Max 10 sessions per user; oldest revoked on overflow

**Web (`apps/web`):**
- [ ] Registration form (React Hook Form + Zod from contracts)
- [ ] Login form
- [ ] Email verification screen
- [ ] Forgot/reset password screens
- [ ] Google Sign-In button (web OAuth flow)
- [ ] Auth token storage in memory; refresh token in httpOnly cookie
- [ ] Silent token refresh on 401
- [ ] Protected route wrapper
- [ ] Basic settings screen: display name, language, timezone, change password

**Mobile (`apps/mobile`):**
- [ ] Registration, login, email verification, password reset screens
- [ ] Google Sign-In (Expo AuthSession)
- [ ] Refresh token storage in Expo SecureStore
- [ ] Silent token refresh on 401
- [ ] Protected navigation layout

**Shared:**
- [ ] Auth-related Zod schemas in `packages/contracts`
- [ ] Auth API functions in `packages/api-client`

### Acceptance Criteria
- Complete auth flow on web: register → verify email → login → access protected page → logout
- Complete auth flow on mobile (Android AND iOS)
- Google Sign-In works on web, Android, and iOS
- Refresh token rotation: using a previously rotated token returns `401`
- Account deletion removes all data (verified by database query)
- Rate limiting returns `429` after threshold
- No plaintext passwords in logs or API responses
- argon2 hash format confirmed in `AuthIdentity.passwordHash`

### Risks

| Risk | Mitigation |
|------|-----------|
| Google OAuth redirect URIs differ per platform | Configure separate client IDs for web, Android, iOS in Google Cloud Console |
| Expo AuthSession requires correct scheme configuration | Test on both simulators and physical devices early |
| Email delivery in development | Use Mailtrap or similar for dev; document SMTP configuration |

---

## Phase 4 — Academic Core: Periods, Subjects, Timetable, Tasks, Assessments

**Depends on:** Phase 3 accepted

### Deliverables

**Backend:**
- [ ] All CRUD endpoints for `AcademicPeriod` (`/api/v1/periods`)
- [ ] All CRUD endpoints for `Subject` (`/api/v1/periods/:id/subjects`, `/api/v1/subjects/:id`)
- [ ] All CRUD endpoints for `ClassSession` (`/api/v1/timetable`)
- [ ] All CRUD endpoints for `Task` (`/api/v1/tasks`) with filtering and pagination
- [ ] All CRUD endpoints for `Assessment` (`/api/v1/assessments`) with filtering and pagination
- [ ] `GET /api/v1/dashboard` endpoint
- [ ] Ownership enforcement on all new endpoints
- [ ] Zod validation on all request bodies (from `packages/contracts`)

**Web:**
- [ ] Academic period list, create, edit, archive, delete
- [ ] Subject list, create, edit, archive, delete (within period)
- [ ] Weekly timetable view with class session create/edit/delete
- [ ] Task list, create, edit, complete, delete with filters
- [ ] Assessment list, create, edit (with score entry), delete
- [ ] Dashboard: today's classes, upcoming tasks, upcoming assessments

**Mobile:**
- [ ] Same screens as web (mobile-appropriate UX)
- [ ] Foreground refresh on app focus (TanStack Query `refetchOnWindowFocus` / `refetchOnAppState`)

**Shared:**
- [ ] Zod schemas for all Phase 4 entities in `packages/contracts`
- [ ] API client functions for all Phase 4 endpoints in `packages/api-client`

### Acceptance Criteria
- CRUD works end-to-end on all three platforms for all entities
- Dashboard shows accurate today's classes based on weekday and user timezone
- Tasks marked complete are removed from the default (incomplete) filter
- Ownership: attempting to access another user's data returns `403` or `404`
- Pagination tested: >20 tasks returns correct next cursor
- TanStack Query invalidates cache after create/update/delete (no manual refresh required)

### Risks

| Risk | Mitigation |
|------|-----------|
| Timezone display bugs (timetable wall-clock vs UTC) | Write unit tests for timezone conversion in `packages/academic-core`; test with multiple timezones (Asia/Tashkent, Europe/Moscow, America/New_York) |
| Dashboard query performance at scale | Add composite indexes from `docs/database-design.md`; profile query plan |

---

## Phase 5 — Grading Calculations and Localization

**Depends on:** Phase 4 accepted

### Deliverables

**Grading (`packages/academic-core`):**
- [ ] `calculatePercentageGrade(rawScore, maxScore): number`
- [ ] `calculateSubjectAverage(assessments[]): number | null`
- [ ] `mapPercentageToBand(percentage, scaleEntries[]): GradeScaleEntry | null`
- [ ] `calculateGPA(subjects[]): GPAResult`
- [ ] All validation rules from `docs/grading-rules.md §5`
- [ ] Unit tests covering all examples from `docs/grading-rules.md`
- [ ] Edge cases: all missing, all excused, zero rawScore, single assessment

**Backend:**
- [ ] `GET /api/v1/subjects/:id/grade` — computed subject grade
- [ ] `GET /api/v1/periods/:id/gpa` — computed GPA
- [ ] All CRUD for `GradingScheme` and `GradeScaleEntry`
- [ ] Scheme version increment on boundary change
- [ ] `CourseGrade` snapshot write on grade calculation

**Web + Mobile:**
- [ ] Grading scheme list, create, edit, delete
- [ ] Subject grade display (percentage, band, grade points)
- [ ] Period GPA display with per-subject breakdown
- [ ] Assessment weight entry with sum-to-100% warning

**Localization:**
- [ ] `packages/i18n` fully populated for `en`, `uz`, `ru`
- [ ] `react-i18next` initialized in `apps/web` and `apps/mobile`
- [ ] `formatters.ts` for dates, times, numbers per locale
- [ ] Language selector in onboarding and settings
- [ ] User language preference synchronized via API
- [ ] Server-side notification templates translated
- [ ] Manual QA: complete walkthrough in all three languages on all platforms

### Acceptance Criteria
- All grading examples in `docs/grading-rules.md` produce correct output from unit tests
- Changing language in settings updates UI immediately without restart
- All three languages display correctly including Cyrillic (`ru`) and Uzbek Latin (`uz`)
- Missing assessment excluded from average; zero score included as 0%
- GPA returns `null` for ineligible subjects with a documented reason
- Historical `CourseGrade` snapshot not affected by scheme version change
- Date and number formats match locale specifications in `docs/localization.md`

---

## Phase 6 — Synchronization Resilience and Notifications

**Depends on:** Phase 5 accepted

### Deliverables

**Offline resilience:**
- [ ] Form values preserved on network error (no auto-clear)
- [ ] Localized error messages for network failure and server errors
- [ ] Retry button on failed mutations
- [ ] Idempotency key support on task and assessment creation
- [ ] Session expiry detected and handled (refresh or redirect to login)
- [ ] Ambiguous failure cases documented in code comments per `docs/product-requirements.md §SYNC-07`

**Push notifications:**
- [ ] `POST /api/v1/devices` — device token registration
- [ ] `DELETE /api/v1/devices/:id` — device token removal
- [ ] Notification preference CRUD endpoints
- [ ] Server-side notification scheduler (cron job): query pending notifications, send via Expo Push API
- [ ] `NotificationDelivery` log written on each dispatch attempt
- [ ] Failed token cleanup (remove Device record on `DeviceNotRegistered` error)
- [ ] Mobile: request push permission on onboarding, register token
- [ ] Mobile: unregister token on logout

**Data refresh:**
- [ ] Mobile: TanStack Query `refetchOnWindowFocus` (AppState `active`)
- [ ] Web: TanStack Query `refetchOnWindowFocus` enabled
- [ ] Stale-time configuration tuned per resource type

### Acceptance Criteria
- Submit a form while offline: form values preserved, error shown, retry succeeds when online
- Push notification arrives within 2 minutes of lead-time threshold on iOS and Android
- Logging out on mobile unregisters device token; no further notifications sent
- Invalid Expo token removed from `Device` table after first failure
- Session expiry on mobile: silent refresh succeeds without user action; on refresh failure, redirect to login

---

## Phase 7 — Testing, Deployment, and Release Preparation

**Depends on:** Phase 6 accepted

### Deliverables

**Testing:**
- [ ] Unit tests: `packages/academic-core` (100% coverage of grade calculation logic)
- [ ] Unit tests: auth service (token generation, refresh, rotation)
- [ ] Integration tests: all auth endpoints (Supertest)
- [ ] Integration tests: CRUD for periods, subjects, tasks, assessments
- [ ] Integration tests: ownership enforcement (403/404 for other user's resources)
- [ ] E2E tests (Playwright, web): registration → dashboard → add task → complete task
- [ ] E2E tests (Detox or Maestro, mobile): login → create subject → timetable view

**Security review:**
- [ ] Confirm no secrets in client bundles (audit `VITE_` variables)
- [ ] Confirm all auth endpoints rate-limited
- [ ] Confirm all data endpoints enforce ownership
- [ ] Dependency audit (`pnpm audit`)
- [ ] Review argon2 parameters (memory, iterations, parallelism)

**Deployment:**
- [ ] `apps/web`: production Vite build deployable to CDN (Vercel, Netlify, or Cloudflare Pages)
- [ ] `apps/api`: Dockerized, deployable to container platform (Railway, Render, or Cloud Run)
- [ ] PostgreSQL: managed database provisioned with connection pooling
- [ ] Environment variables documented and set in deployment environment
- [ ] Database migration runs automatically on deploy (Prisma `migrate deploy`)
- [ ] Health check endpoint monitored

**Mobile release:**
- [ ] Expo EAS Build configured for Android and iOS
- [ ] Android APK/AAB built and tested on physical device
- [ ] iOS IPA built and tested on physical device (TestFlight)
- [ ] App Store and Google Play listings prepared (icons, screenshots, descriptions)
- [ ] Push notification certificates configured in Expo

**Documentation:**
- [ ] `README.md` updated with local development setup instructions
- [ ] Environment variable reference finalized

### Acceptance Criteria
- Unit test suite passes with zero failures
- Integration test suite passes against a test database
- Web app passes E2E suite on CI
- Mobile E2E tests pass on Android emulator and iOS simulator
- Production deployment: all three platforms accessible and functional
- No `p0` or `p1` bugs outstanding
- App Store and Google Play submissions made (or TestFlight / internal track for beta)

---

## Dependency Graph

```
Phase 1 (Docs)
    │
    ▼
Phase 2 (Monorepo + DB)
    │
    ▼
Phase 3 (Auth)
    │
    ▼
Phase 4 (Academic Core CRUD)
    │
    ▼
Phase 5 (Grading + i18n)
    │
    ▼
Phase 6 (Resilience + Notifications)
    │
    ▼
Phase 7 (Testing + Deployment + Release)
```

---

## Milestone Timeline (Reference, Not Binding)

| Phase | Estimated Duration | Notes |
|-------|--------------------|-------|
| Phase 1 | 1 day | ✅ Completing |
| Phase 2 | 3–5 days | Risk: Expo monorepo setup |
| Phase 3 | 5–7 days | Risk: Google OAuth per-platform |
| Phase 4 | 7–10 days | Largest feature surface |
| Phase 5 | 5–7 days | Localization is thorough work |
| Phase 6 | 4–5 days | |
| Phase 7 | 5–7 days | App Store review time unpredictable |

> **Note:** These are estimates for a small team (2–3 engineers). Adjust based on actual team size and velocity.

---

## Definition of Done (Global)

A feature is **done** when:
1. Backend endpoint implemented, validated, and ownership-enforced.
2. Web UI functional for the feature with correct loading, error, and empty states.
3. Mobile UI functional on both Android and iOS.
4. All UI strings use translation keys; English, Uzbek, Russian strings provided.
5. Unit or integration test covers the core logic.
6. No TypeScript errors or lint violations introduced.
7. PR reviewed and merged; CI passes.
