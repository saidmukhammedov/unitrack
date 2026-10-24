# UniTrack — Architecture Specification

**Version:** 2.2.0  
**Date:** 2026-10-24  
**Status:** Architecture Refinement Specification (Approved)  
**Product Vision:** Universal Personal Productivity Platform (Plan ➔ Act ➔ Review ➔ Improve)  
**Visual System:** The Chronicle (Restrained Editorial Monograph + Tabular Time Precision)

---

## 1. System Overview

UniTrack is a unified personal productivity platform built as a TypeScript monorepo with `pnpm` workspaces. A serverless PostgreSQL database is authoritative. All clients (Web SPA, React Native mobile) communicate with the backend exclusively through a versioned REST API.

```
┌─────────────────────────────────────────────────────────────────┐
│                        UniTrack Monorepo                        │
│                                                                 │
│  apps/web (Vercel) apps/mobile (Expo)   apps/api (Render)       │
│  (React + Vite)    (React Native)       (Node.js + Express)     │
│       │                  │                     │                │
│       └──────────────────┴─────────────────────┘                │
│                          │                                      │
│              packages/contracts   (Universal Zod schemas, types)│
│              packages/api-client  (Typed HTTP client)           │
│              packages/i18n        (Translations, formatters)    │
│              packages/academic-core (Optional GPA/grade logic)  │
│              packages/config      (Shared tooling & configs)    │
└─────────────────────────────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │ (Neon Serverless)
                    └─────────────┘
```

---

## 2. Core Domain Architecture

The platform organizes personal productivity around four continuous phases: **Plan ➔ Act ➔ Review ➔ Improve**.

### 2.1 Life Contexts (`Context`)
- User-defined areas of responsibility (e.g., `Personal`, `Work`, `Study`).
- Automatically initialized on registration with 3 editable defaults: `Personal` (`#C84B31`), `Work` (`#2563EB`), `Study` (`#059669`).
- Deleting a context never destroys associated work; it nullifies `contextId` (`ON DELETE SET NULL`).

### 2.2 Scheduling Architecture (`ScheduleCommitment` & `CommitmentLog`)
- Universal time blocks supporting:
  - **Recurring commitments**: Defined by `weekday`, `startTime`, `endTime`, `effectiveFrom`, and `effectiveTo`.
  - **One-off events**: Defined by `specificDate`.
  - **Overnight events**: When `endTime <= startTime`, spanning from evening of date $D$ to morning of date $D+1$.
- **Timezone & Wall-Clock Principle**: Start and end times are stored as wall-clock `TIME` and evaluated against the user's IANA `timezone`, keeping routine times stable across Daylight Saving Time (DST) shifts.
- **Occurrence Exceptions (`CommitmentLog`)**: Recurring patterns are never mutated for a single-day change. Individual occurrences record cancellations or rescheduled times in `CommitmentLog`.
- **Cancellation Visibility**: Cancelled occurrences are hidden by default on the Today view, with an intuitive toggle to inspect them.
- **Academic Integration**: The existing `ClassSession` table remains completely untouched to preserve compound foreign keys and academic course relations. The Today view unifies both into a single stream.

### 2.3 Single Authoritative Task Status Model
- Authoritative state machine: `TaskStatus` (`PENDING`, `COMPLETED`, `POSTPONED`, `CANCELLED`).
- `completedAt` is non-null if and only if `status === 'COMPLETED'`.
- `isCompleted` is preserved in contracts as a virtual/computed property for backwards compatibility.
- Postponement updates `dueAt`, increments `postponedCount`, and sets `status = 'POSTPONED'`.

### 2.4 Habits & Daily Routines (`Habit` & `HabitLog`)
- Frequency modes: `DAILY`, `SELECTED_WEEKDAYS` (e.g. Mon, Wed, Fri), and `WEEKLY_TARGET` (e.g. 3x/week).
- Status semantics:
  - `COMPLETED`: Activity performed; increments streak.
  - `SKIPPED`: Legitimate intentional pause (rest day, sickness, travel); **does not break streak**.
  - `MISSED`: Neglected on an active day; **breaks streak**.
- Backdated logging is fully supported; streaks are computed from source history and cached on `Habit.currentStreak` inside write transactions.

### 2.5 Deterministic Concurrency & Offline Sync
- Every mutable entity (`Task`, `ScheduleCommitment`, `Habit`, `Goal`) includes an integer `version Int @default(1)`.
- Mutations use Optimistic Concurrency Control (OCC). If `client.version < server.version`, the API returns `409 VERSION_CONFLICT` with the server snapshot so no user edit is silently lost.
- All mutations accept an `Idempotency-Key` header to make network retries safe.

---

## 3. The Chronicle Design System

- **Typographic Scale**:
  - Headings & Chapter Anchors: *Newsreader* / *Instrument Serif* (Display 32px, Section 22px).
  - UI, Forms & Reading: *Geist Sans* / *Inter* (Body 14px, Label 12px uppercase tracking).
  - Time Coordinates & Metrics: *Geist Mono* (Tabular numerals, strict column alignment).
- **Surface Palette**:
  - Light Canvas: Warm unbleached paper (`#FBF9F5`) with rich ink (`#18181B`) and 1px hairline rules (`#E6E2D8`).
  - Dark Canvas: Warm charcoal (`#141312`) with bone text (`#EAE5DE`) and hairline rules (`#2A2825`).
  - Accent Inks: Editorial Vermilion (`#C84B31`), Forest Sage (`#3D6B52`), Ochre (`#B47D28`).
- **Restraint**: Zero premature weather widgets, arbitrary 1–5 day scores, excessive gamification badges, or generic boxy card grids.
