# UniTrack — Database Design Specification

**Version:** 2.1.0  
**Date:** 2026-10-23  
**Status:** Architecture Refinement Specification  
**Strategy:** Additive Evolution (Zero Data Loss, Zero Destructive Changes)

---

## 1. Design Principles

- **UUID primary keys** on all tables (`gen_random_uuid()`).
- **UTC timestamps** for all real-world instants (`TIMESTAMPTZ`).
- **Wall-clock times** (`TIME`) for recurring daily schedules, evaluated against the user's stored IANA `timezone`.
- **Row-level ownership**: Every table includes `userId UUID NOT NULL` indexed and enforced by API authorization.
- **Additive Evolution**: Existing academic tables (`AcademicPeriod`, `Subject`, `Assessment`, `GradingScheme`, `CourseGrade`) remain completely intact. New universal productivity tables are added safely.

---

## 2. Entity-Relationship Overview

```
User (id, email, displayName, timezone, languageCode)
 ├── AuthIdentity (1:N)
 ├── RefreshSession (1:N)
 ├── Context (1:N) [NEW]
 │     ├── Task (0..N)
 │     ├── ScheduleCommitment (0..N)
 │     ├── Habit (0..N)
 │     └── Goal (0..N)
 ├── ScheduleCommitment (1:N) [EVOLVED from ClassSession]
 │     └── CommitmentLog (1:N) [NEW]
 ├── Task (1:N)
 ├── Habit (1:N) [NEW]
 │     └── HabitLog (1:N) [NEW]
 ├── Goal (1:N) [NEW]
 │     └── GoalMilestone (1:N) [NEW]
 ├── DailyReview (1:N) [NEW]
 ├── WeeklyReview (1:N) [NEW]
 ├── Device (1:N)
 ├── NotificationPreference (1:N)
 └── [Optional Academic Module: AcademicPeriod, Subject, Assessment, GradingScheme]
```

---

## 3. Detailed Model Definitions

### 3.1 `Context` (Life Area)
User-created contexts (`Personal`, `Work`, `University`, `Health`, `Startup`).
- `id`: `UUID PK`
- `userId`: `UUID NOT NULL` (FK `User.id` ON DELETE CASCADE)
- `name`: `VARCHAR(50) NOT NULL`
- `colorHex`: `VARCHAR(7) NOT NULL` (e.g. `#C84B31`)
- `icon`: `VARCHAR(30) NULL`
- `sortOrder`: `SMALLINT NOT NULL DEFAULT 0`
- `isArchived`: `BOOLEAN NOT NULL DEFAULT false`
- `createdAt`, `updatedAt`: `TIMESTAMPTZ`
- *Constraints/Indexes*: `@@unique([userId, name])`, `@@index([userId, isArchived])`

### 3.2 `ScheduleCommitment` (Generalization of `ClassSession`)
General-purpose time block supporting both recurring commitments and one-off events.
- `id`: `UUID PK`
- `userId`: `UUID NOT NULL` (FK `User.id` ON DELETE CASCADE)
- `contextId`: `UUID NULL` (FK `Context.id` ON DELETE SET NULL)
- `title`: `VARCHAR(200) NOT NULL`
- `location`: `VARCHAR(150) NULL`
- `specificDate`: `DATE NULL` (Populated for one-off events; NULL for weekly recurring)
- `weekday`: `SMALLINT NULL` (0=Sunday .. 6=Saturday for recurring)
- `startTime`: `TIME NOT NULL`
- `endTime`: `TIME NOT NULL`
- `effectiveFrom`: `DATE NOT NULL`
- `effectiveTo`: `DATE NULL`
- `isArchived`: `BOOLEAN NOT NULL DEFAULT false`
- `subjectId`: `UUID NULL` (FK `Subject.id` ON DELETE SET NULL, optional academic bridge)
- `periodId`: `UUID NULL` (FK `AcademicPeriod.id` ON DELETE SET NULL, optional academic bridge)
- `createdAt`, `updatedAt`: `TIMESTAMPTZ`
- *Constraints/Indexes*: `@@index([userId, specificDate])`, `@@index([userId, weekday])`, `@@index([userId, contextId])`

### 3.3 `CommitmentLog`
Records day-specific attendance, cancellations, and rescheduled times.
- `id`: `UUID PK`
- `userId`: `UUID NOT NULL` (FK `User.id` ON DELETE CASCADE)
- `commitmentId`: `UUID NOT NULL` (FK `ScheduleCommitment.id` ON DELETE CASCADE)
- `date`: `DATE NOT NULL`
- `status`: `ENUM('ATTENDED', 'MISSED', 'CANCELLED', 'RESCHEDULED') NOT NULL`
- `rescheduledStartTime`: `TIME NULL`
- `rescheduledEndTime`: `TIME NULL`
- `notes`: `TEXT NULL`
- `createdAt`, `updatedAt`: `TIMESTAMPTZ`
- *Constraints/Indexes*: `@@unique([commitmentId, date])`, `@@index([userId, date])`

### 3.4 `Task` (Universal Deadlines & Actions)
- `id`: `UUID PK`
- `userId`: `UUID NOT NULL` (FK `User.id` ON DELETE CASCADE)
- `contextId`: `UUID NULL` (FK `Context.id` ON DELETE SET NULL)
- `goalId`: `UUID NULL` (FK `Goal.id` ON DELETE SET NULL)
- `title`: `VARCHAR(255) NOT NULL`
- `description`: `TEXT NULL`
- `priority`: `ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM'`
- `dueAt`: `TIMESTAMPTZ NULL`
- `completedAt`: `TIMESTAMPTZ NULL`
- `isCompleted`: `BOOLEAN NOT NULL DEFAULT false`
- `estimatedMinutes`: `INTEGER NULL`
- `postponedCount`: `INTEGER NOT NULL DEFAULT 0`
- `createdAt`, `updatedAt`: `TIMESTAMPTZ`
- *Constraints/Indexes*: `@@index([userId, dueAt])`, `@@index([userId, isCompleted])`, `@@index([userId, contextId])`

### 3.5 `Habit` & `HabitLog`
- `Habit`:
  - `id`: `UUID PK`
  - `userId`: `UUID NOT NULL` (FK `User.id` ON DELETE CASCADE)
  - `contextId`: `UUID NULL` (FK `Context.id` ON DELETE SET NULL)
  - `title`: `VARCHAR(150) NOT NULL`
  - `frequency`: `ENUM('DAILY', 'WEEKDAYS', 'WEEKLY_TARGET') NOT NULL DEFAULT 'DAILY'`
  - `targetUnits`: `INTEGER NOT NULL DEFAULT 1`
  - `unitLabel`: `VARCHAR(30) NULL` (e.g., "pages", "km", "times")
  - `currentStreak`: `INTEGER NOT NULL DEFAULT 0` (Cached from `HabitLog`)
  - `longestStreak`: `INTEGER NOT NULL DEFAULT 0` (Cached from `HabitLog`)
  - `isArchived`: `BOOLEAN NOT NULL DEFAULT false`
  - `createdAt`, `updatedAt`: `TIMESTAMPTZ`
- `HabitLog`:
  - `id`: `UUID PK`
  - `userId`: `UUID NOT NULL` (FK `User.id` ON DELETE CASCADE)
  - `habitId`: `UUID NOT NULL` (FK `Habit.id` ON DELETE CASCADE)
  - `date`: `DATE NOT NULL`
  - `status`: `ENUM('COMPLETED', 'SKIPPED', 'MISSED') NOT NULL DEFAULT 'COMPLETED'`
  - `completedUnits`: `INTEGER NOT NULL DEFAULT 1`
  - `notes`: `TEXT NULL`
  - `createdAt`, `updatedAt`: `TIMESTAMPTZ`
  - *Constraints/Indexes*: `@@unique([habitId, date])`, `@@index([userId, date])`

### 3.6 `Goal` & `GoalMilestone`
- `Goal`:
  - `id`: `UUID PK`
  - `userId`: `UUID NOT NULL` (FK `User.id` ON DELETE CASCADE)
  - `contextId`: `UUID NULL` (FK `Context.id` ON DELETE SET NULL)
  - `title`: `VARCHAR(200) NOT NULL`
  - `description`: `TEXT NULL`
  - `targetDate`: `DATE NULL`
  - `status`: `ENUM('IN_PROGRESS', 'ACHIEVED', 'PAUSED', 'ABANDONED') NOT NULL DEFAULT 'IN_PROGRESS'`
  - `progressType`: `ENUM('MILESTONES', 'TASKS_LINKED', 'MANUAL') NOT NULL DEFAULT 'MILESTONES'`
  - `manualProgress`: `SMALLINT NULL`
  - `createdAt`, `updatedAt`: `TIMESTAMPTZ`
- `GoalMilestone`:
  - `id`: `UUID PK`
  - `goalId`: `UUID NOT NULL` (FK `Goal.id` ON DELETE CASCADE)
  - `title`: `VARCHAR(200) NOT NULL`
  - `targetDate`: `DATE NULL`
  - `isCompleted`: `BOOLEAN NOT NULL DEFAULT false`
  - `completedAt`: `TIMESTAMPTZ NULL`
  - `sortOrder`: `SMALLINT NOT NULL DEFAULT 0`
  - `createdAt`, `updatedAt`: `TIMESTAMPTZ`
  - *Constraints/Indexes*: `@@index([goalId, sortOrder])`

### 3.7 `DailyReview` & `WeeklyReview`
- `DailyReview`:
  - `id`: `UUID PK`
  - `userId`: `UUID NOT NULL` (FK `User.id` ON DELETE CASCADE)
  - `date`: `DATE NOT NULL`
  - `topIntentions`: `TEXT[]` (Array of up to 3 strings/task titles)
  - `eveningReflection`: `TEXT NULL`
  - `energyScore`: `SMALLINT NULL` (1 to 5)
  - `tasksCompletedCount`: `INTEGER NOT NULL DEFAULT 0`
  - `commitmentsAttendedCount`: `INTEGER NOT NULL DEFAULT 0`
  - `habitsCompletedCount`: `INTEGER NOT NULL DEFAULT 0`
  - `createdAt`, `updatedAt`: `TIMESTAMPTZ`
  - *Constraints/Indexes*: `@@unique([userId, date])`
- `WeeklyReview`:
  - `id`: `UUID PK`
  - `userId`: `UUID NOT NULL` (FK `User.id` ON DELETE CASCADE)
  - `year`: `INTEGER NOT NULL`
  - `isoWeek`: `SMALLINT NOT NULL` (1 to 53)
  - `summary`: `TEXT NULL`
  - `wins`: `TEXT NULL`
  - `bottlenecks`: `TEXT NULL`
  - `nextWeekPriorities`: `TEXT[]`
  - `habitAdherenceRate`: `DECIMAL(5,2) NOT NULL DEFAULT 0.00`
  - `createdAt`, `updatedAt`: `TIMESTAMPTZ`
  - *Constraints/Indexes*: `@@unique([userId, year, isoWeek])`

---

## 4. Migration & Rollback Strategy

1. **Step 1: Expand Contracts**: Add non-destructive Zod schemas to `packages/contracts`.
2. **Step 2: Additive Prisma Migration**:
   - `prisma migrate dev --create-only`
   - Add new tables (`Context`, `CommitmentLog`, `Habit`, `HabitLog`, `Goal`, `GoalMilestone`, `DailyReview`, `WeeklyReview`).
   - Alter `ClassSession` to make `subjectId` and `periodId` nullable, adding `title` and `specificDate`.
3. **Step 3: Verification**:
   - Run full regression test suite (`pnpm test`).
   - Ensure existing staging database rows are completely intact.
4. **Rollback Plan**:
   - If rollback is required, dropping only the new tables leaves all original Phase 1-6 tables (`User`, `AcademicPeriod`, `Subject`, `ClassSession`, `Assessment`, `GradingScheme`) fully functional.
