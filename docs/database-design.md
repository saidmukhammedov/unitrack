# UniTrack — Database Design

**Version:** 1.0.0  
**Date:** 2026-10-22  
**Status:** Approved for Phase 2 Implementation

---

## 1. Principles

- **UUID primary keys** on all tables (PostgreSQL `uuid` type, default `gen_random_uuid()`).
- **UTC timestamps** for all instants (`TIMESTAMPTZ`). Display is handled in the application layer using the user's IANA timezone.
- **Soft deletes** are not used in the MVP. Hard deletes with explicit cascade rules.
- **Row-level ownership**: every resource table includes a `userId` column. The API layer enforces that only the owning user can read or modify their rows. Database constraints reinforce this through foreign keys.
- **No cross-user data sharing**: no JOIN-based queries that could expose another user's data.
- **Prisma schema** is the canonical source of truth; this document describes the intended schema in human-readable form.

---

## 2. Entity-Relationship Overview

```
User
 ├── AuthIdentity (1:N)
 ├── RefreshSession (1:N)
 ├── AcademicPeriod (1:N)
 │     └── Subject (1:N)
 │           ├── ClassSession (1:N)
 │           ├── Task (1:N, optional subjectId)
 │           ├── Assessment (1:N)
 │           └── CourseGrade (1:N)
 ├── Task (1:N, no-subject tasks)
 ├── GradingScheme (1:N)
 │     └── GradeScaleEntry (1:N)
 ├── Device (1:N)
 ├── NotificationPreference (1:N)
 └── NotificationDelivery (1:N)
```

---

## 3. Table Definitions

### 3.1 `User`

Stores core account information.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `email` | `VARCHAR(320)` | UNIQUE, NOT NULL | Normalized to lowercase |
| `emailVerified` | `BOOLEAN` | NOT NULL, default `false` | |
| `displayName` | `VARCHAR(100)` | NOT NULL | |
| `avatarUrl` | `TEXT` | nullable | |
| `timezone` | `VARCHAR(64)` | NOT NULL, default `'UTC'` | IANA timezone string |
| `languageCode` | `VARCHAR(10)` | NOT NULL, default `'en'` | BCP-47 code |
| `institutionType` | `ENUM('SCHOOL','UNIVERSITY','OTHER')` | NOT NULL, default `'OTHER'` | |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:** `email` (unique), `createdAt`

**Notes:**
- `email` is stored for display and communication only. It is **not** used as an authentication identity on its own.
- Password is stored in `AuthIdentity`, not here.

---

### 3.2 `AuthIdentity`

Supports multiple authentication methods per account. One row per provider per user.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `provider` | `ENUM('EMAIL_PASSWORD','GOOGLE')` | NOT NULL | |
| `providerAccountId` | `TEXT` | NOT NULL | Google `sub` claim; for `EMAIL_PASSWORD` use `User.id` (UUID) — **not** the email address. **[D-01 / I-19]** |
| `passwordHash` | `TEXT` | nullable | argon2 hash; null for OAuth identities |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:** `UNIQUE(provider, providerAccountId)`

**Constraints:**
- `passwordHash` must be NOT NULL when `provider = 'EMAIL_PASSWORD'`.
- The unique index on `(provider, providerAccountId)` prevents duplicate identities.
- Accounts are **not** automatically merged if two identities share the same email. Merging is an explicit user-initiated action (out of scope for MVP).

**providerAccountId values by provider:** **[I-19 resolved]**
- `EMAIL_PASSWORD`: the stable `User.id` UUID. Login uses `User.email` to locate the `User` row, then retrieves the `AuthIdentity` via `userId`. The email address is not stored here and does not need updating if the user changes their email.
- `GOOGLE`: the `sub` claim from the verified Google ID token — stable Google account identifier.

---

### 3.3 `RefreshSession`

Tracks active refresh token sessions.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `tokenHash` | `TEXT` | UNIQUE, NOT NULL | SHA-256 hash of the opaque refresh token |
| `deviceInfo` | `TEXT` | nullable | User-agent or device label |
| `ipAddress` | `INET` | nullable | IP at session creation |
| `expiresAt` | `TIMESTAMPTZ` | NOT NULL | |
| `revokedAt` | `TIMESTAMPTZ` | nullable | Set on logout or rotation |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:** `tokenHash` (unique), `(userId, expiresAt)`, `expiresAt` (for cleanup jobs)

**Notes:**
- The raw refresh token is never stored. Only its SHA-256 hash is persisted.
- On use, the old session is revoked and a new `RefreshSession` is created (rotation).
- Maximum 10 active (non-revoked, non-expired) sessions per user. Oldest is revoked on overflow.
- A background job periodically deletes expired and revoked sessions.

---

### 3.4 `AcademicPeriod`

Represents a named period of study (school year, semester, term).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `name` | `VARCHAR(100)` | NOT NULL | e.g., "Spring 2026", "Grade 10" |
| `type` | `ENUM('SCHOOL_YEAR','SEMESTER','TRIMESTER','QUARTER','CUSTOM')` | NOT NULL | |
| `startDate` | `DATE` | NOT NULL | |
| `endDate` | `DATE` | NOT NULL | |
| `isArchived` | `BOOLEAN` | NOT NULL, default `false` | |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Constraints:** `endDate >= startDate`  
**Indexes:** `(userId, isArchived)`, `(userId, startDate)`

---

### 3.5 `Subject`

A course or school subject within an academic period.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `periodId` | `UUID` | FK → `AcademicPeriod.id` ON DELETE CASCADE, NOT NULL | |
| `gradingSchemeId` | `UUID` | FK → `GradingScheme.id` ON DELETE SET NULL | nullable |
| `name` | `VARCHAR(150)` | NOT NULL | |
| `colorHex` | `CHAR(7)` | nullable | e.g., `#4A90D9` |
| `teacherName` | `VARCHAR(100)` | nullable | |
| `creditHours` | `DECIMAL(4,1)` | nullable | University use; must be > 0 if set |
| `isArchived` | `BOOLEAN` | NOT NULL, default `false` | |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Constraints:**
- `UNIQUE(id, periodId)` — Composite unique constraint supporting compound foreign keys from `ClassSession` and `Assessment` to enforce period consistency at the database level. **[D-02 / A-02]**

**Indexes:** `(userId, periodId)`, `(userId, isArchived)`, `UNIQUE(id, periodId)`  
**Ownership check:** API must verify `AcademicPeriod.userId = req.user.id` before inserting a Subject. Period reassignment after creation is prohibited.

---

### 3.6 `ClassSession`

A recurring weekly timetable entry for a subject.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `subjectId` | `UUID` | FK → `Subject.id` ON DELETE CASCADE, NOT NULL | |
| `periodId` | `UUID` | FK → `AcademicPeriod.id` ON DELETE CASCADE, NOT NULL | **[D-02]** Direct period link for efficient filtering |
| `weekday` | `SMALLINT` | NOT NULL, CHECK(weekday >= 0 AND weekday <= 6) | 0 = Sunday, 1 = Monday … 6 = Saturday (JS `Date.getDay()` convention) |
| `startTime` | `TIME` | NOT NULL | Local wall-clock time (no timezone) |
| `endTime` | `TIME` | NOT NULL | Local wall-clock time (no timezone) |
| `location` | `VARCHAR(150)` | nullable | Room or building |
| `effectiveFrom` | `DATE` | NOT NULL | First date this session applies |
| `effectiveTo` | `DATE` | nullable | Last date; null means indefinite (until period end) |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Constraints & Period Integrity [D-02 / A-02]:**
- `endTime > startTime`
- `weekday >= 0 AND weekday <= 6`
- **Database-level period constraint:** `FOREIGN KEY (subjectId, periodId) REFERENCES Subject(id, periodId) ON DELETE CASCADE`. This composite foreign key makes it physically impossible for a `ClassSession` to reference a `Subject` and `AcademicPeriod` belonging to different periods.
- **Service-layer validation:** On `POST /api/v1/timetable`, the client submits `subjectId`; `periodId` is derived directly from `Subject.periodId` (client-provided `periodId` is ignored/disallowed). On `PATCH /api/v1/timetable/:id`, `periodId` is immutable. If `subjectId` is updated, the service validates ownership and updates `periodId` to the new subject's `periodId` atomically.

**Indexes:** `(userId, subjectId)`, `(userId, periodId, weekday)`

**Weekday numbering:** 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday. This matches JavaScript's `Date.prototype.getDay()`. All weekday computations across the server and client **must** use this convention. **[I-18]**

**Derivation rule:** When creating a `ClassSession`, the API derives `periodId` from `Subject.periodId` (looked up by `subjectId`). The client does not send `periodId` in the request body. The service validates that `Subject.userId = req.user.id` and `Subject.periodId` is a valid, non-archived period.

**Notes on time handling:**
- `startTime` and `endTime` are wall-clock local times. The user's IANA timezone (from `User.timezone`) is applied at display time.
- The application converts these to UTC only when computing actual event timestamps for notifications.
- No DST correction is stored; the display layer recomputes each time using the user's IANA timezone.

---

### 3.7 `Task`

An assignment, reading, or to-do item.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `subjectId` | `UUID` | FK → `Subject.id` ON DELETE SET NULL | nullable (general task) |
| `periodId` | `UUID` | FK → `AcademicPeriod.id` ON DELETE SET NULL | nullable |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | nullable | |
| `taskType` | `ENUM('HOMEWORK','READING','PROJECT','LAB','PRESENTATION','OTHER')` | NOT NULL, default `'OTHER'` | |
| `dueAt` | `TIMESTAMPTZ` | nullable | UTC |
| `completedAt` | `TIMESTAMPTZ` | nullable | Set when marked complete |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Derived field:** `isCompleted = completedAt IS NOT NULL`  
**Indexes:** `(userId, dueAt)`, `(userId, subjectId)`, `(userId, completedAt)`

---

### 3.8 `Assessment`

An exam, quiz, test, or other graded event.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `subjectId` | `UUID` | FK → `Subject.id` ON DELETE CASCADE, NOT NULL | |
| `periodId` | `UUID` | FK → `AcademicPeriod.id` ON DELETE CASCADE, NOT NULL | **[D-02]** Direct period link; derived from Subject on creation |
| `title` | `VARCHAR(255)` | NOT NULL | |
| `assessmentType` | `ENUM('EXAM','QUIZ','MIDTERM','FINAL','LAB','PRESENTATION','ASSIGNMENT','OTHER')` | NOT NULL | |
| `scheduledAt` | `TIMESTAMPTZ` | NOT NULL | UTC; when the assessment takes place |
| `status` | `ENUM('SCHEDULED','COMPLETED','EXCUSED')` | NOT NULL, default `'SCHEDULED'` | |
| `rawScore` | `DECIMAL(8,2)` | nullable | Recorded after completion |
| `maxScore` | `DECIMAL(8,2)` | nullable | Must be > 0 when set |
| `weight` | `DECIMAL(6,4)` | NOT NULL, default `1.0` | Proportion of subject total (0.0–1.0) |
| `notes` | `TEXT` | nullable | |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Constraints & Integrity [D-01, D-02 / A-01, A-02]:**
- `weight >= 0`
- **Database score CHECK constraint [A-01]:**
  ```sql
  CONSTRAINT assessment_score_check CHECK (
    (maxScore IS NULL OR maxScore > 0) AND
    (rawScore IS NULL OR rawScore >= 0) AND
    (status != 'COMPLETED' OR (rawScore IS NOT NULL AND maxScore IS NOT NULL))
  )
  ```
  - `maxScore` MUST be strictly greater than 0 if present (reject `<= 0`).
  - `rawScore` MUST be non-negative if present (reject `< 0`).
  - `rawScore > maxScore`: **Not blocked** at the database level to permit valid extra credit / bonus work. When `rawScore > maxScore`, the API returns a client-facing warning notice (`RAW_SCORE_EXCEEDS_MAX`), but records the score.
  - `status = 'COMPLETED'`: Strictly requires both `rawScore` and `maxScore` to be NOT NULL.
- **Database period constraint [A-02]:** `FOREIGN KEY (subjectId, periodId) REFERENCES Subject(id, periodId) ON DELETE CASCADE`. Prevents mismatch between the assessment's period and its subject's period at the database engine level.
- **Service-layer validation:** On `POST /api/v1/assessments`, `periodId` is derived from `Subject.periodId`. On `PATCH /api/v1/assessments/:id`, `periodId` is immutable. Transitions to `COMPLETED` require both scores to be present in the update or on the record.

**Indexes:** `(userId, subjectId)`, `(userId, periodId)`, `(userId, scheduledAt)`, `(userId, status)`

---

### 3.9 `GradingScheme`

A reusable grading configuration owned by a user.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `name` | `VARCHAR(100)` | NOT NULL | |
| `schemeType` | `ENUM('PERCENTAGE','WEIGHTED_AVERAGE','SCHOOL_BAND','UNIVERSITY_GPA')` | NOT NULL | |
| `version` | `INTEGER` | NOT NULL, default `1` | Incremented on any edit to grade band entries — informational metadata only |
| `isDefault` | `BOOLEAN` | NOT NULL, default `false` | User's default scheme |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:** `(userId)`, `(userId, isDefault)`

**Versioning strategy — [D-04]:** The `version` integer is incremented whenever `GradeScaleEntry` rows are changed. It is **informational metadata** — it identifies when a change occurred but does not preserve the old boundary data in the database. Historical grade interpretation is preserved via the **snapshot columns** in `CourseGrade` (`computedPercentage`, `computedBand`, `computedGradePoints`), which are written at calculation time and never overwritten. Those snapshot values are the authoritative historical record. Implementors must not attempt to reconstruct historical band boundaries from `schemeVersion` alone.

---

### 3.10 `GradeScaleEntry`

Ordered grade bands within a grading scheme.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `schemeId` | `UUID` | FK → `GradingScheme.id` ON DELETE CASCADE, NOT NULL | |
| `label` | `VARCHAR(20)` | NOT NULL | e.g., "A", "5", "Excellent" |
| `minPercentage` | `DECIMAL(5,2)` | NOT NULL | Inclusive lower bound |
| `maxPercentage` | `DECIMAL(5,2)` | NOT NULL | Inclusive upper bound |
| `gradePoints` | `DECIMAL(4,2)` | nullable | GPA points (university schemes) |
| `sortOrder` | `SMALLINT` | NOT NULL | Display order (highest first) |

**Constraints:**
- `minPercentage >= 0`, `maxPercentage <= 100`
- `minPercentage <= maxPercentage`
- Non-overlapping entries validated at the service layer before insert.

**Indexes:** `(schemeId, sortOrder)`

---

### 3.11 `CourseGrade`

A computed or manually recorded grade snapshot for a subject. Stores an append-only historical audit ledger.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `subjectId` | `UUID` | FK → `Subject.id` ON DELETE CASCADE, NOT NULL | |
| `schemeId` | `UUID` | FK → `GradingScheme.id` ON DELETE SET NULL | nullable |
| `schemeVersion` | `INTEGER` | NOT NULL | Scheme version at calculation time |
| `computedPercentage` | `DECIMAL(5,2)` | nullable | Snapshot of calculated average |
| `computedBand` | `VARCHAR(20)` | nullable | Grade band label at calculation time |
| `computedGradePoints` | `DECIMAL(4,2)` | nullable | GPA points at calculation time |
| `assessmentsIncluded` | `INTEGER` | NOT NULL, default `0` | Number of completed assessments scored |
| `assessmentsExcluded` | `INTEGER` | NOT NULL, default `0` | Number of scheduled/excused assessments omitted |
| `totalWeight` | `DECIMAL(6,4)` | nullable | Sum of weights of included assessments |
| `isManualOverride` | `BOOLEAN` | NOT NULL, default `false` | User manually set this grade |
| `overrideNotes` | `TEXT` | nullable | |
| `calculatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Calculation timestamp |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Snapshot insertion timestamp |

**Indexes [D-03 / A-03]:**
- `(userId, subjectId, calculatedAt DESC, createdAt DESC)` — Primary index for deterministic latest grade retrieval.
- `(userId, subjectId)` — General subject grades lookup.

**Deterministic Latest Grade Retrieval [A-03]:**  
To retrieve the active grade for a subject with complete determinism (including timestamp ties on rapid re-calculations):
```sql
SELECT * FROM "CourseGrade"
WHERE "userId" = :userId AND "subjectId" = :subjectId
ORDER BY "calculatedAt" DESC, "createdAt" DESC, "id" DESC
LIMIT 1;
```

**Auditability vs. Reproducibility Scope [A-03]:**
- **Explainable Transcript (Supported):** Each `CourseGrade` snapshot records the computed outputs (`computedPercentage`, `computedBand`, `computedGradePoints`), the scheme metadata (`schemeId`, `schemeVersion`), the assessment counts (`assessmentsIncluded`, `assessmentsExcluded`), and the total evaluated weight (`totalWeight`). This provides an unambiguous audit trail of what was awarded and under what scheme version.
- **Reproducibility Boundary (Documented):** `CourseGrade` does **not** store an event-sourced frozen copy of all underlying assessment line items. If a student subsequently edits an assessment score or deletes an assessment, historical `CourseGrade` rows are **never modified** (they remain locked as immutable historical records). Recalculating will append a *new* snapshot reflecting current assessments and current scheme boundaries. Re-executing an old calculation from scratch will not yield identical results if the underlying assessment rows have been modified. Full time-travel event-sourcing is explicitly out of scope for MVP.

---

### 3.12 `Device`

Registered mobile devices for push notifications.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `expoPushToken` | `TEXT` | UNIQUE, NOT NULL | Expo push token |
| `platform` | `ENUM('IOS','ANDROID')` | NOT NULL | |
| `deviceLabel` | `VARCHAR(100)` | nullable | Optional user-provided name |
| `lastSeenAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:** `(userId)`, `expoPushToken` (unique)

---

### 3.13 `NotificationPreference`

Per-user, per-category notification settings.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `category` | `ENUM('TASK_REMINDER','ASSESSMENT_REMINDER')` | NOT NULL | |
| `isEnabled` | `BOOLEAN` | NOT NULL, default `true` | |
| `leadTimeMinutes` | `INTEGER` | NOT NULL | Minutes before event to notify |
| `updatedAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Constraints:** `leadTimeMinutes > 0`  
**Indexes:** `UNIQUE(userId, category)`

---

### 3.14 `NotificationDelivery`

Audit log of notification dispatch attempts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `userId` | `UUID` | FK → `User.id` ON DELETE CASCADE, NOT NULL | |
| `deviceId` | `UUID` | FK → `Device.id` ON DELETE SET NULL | nullable |
| `referenceType` | `ENUM('TASK','ASSESSMENT')` | NOT NULL | Which entity triggered this |
| `referenceId` | `UUID` | NOT NULL | ID of the Task or Assessment |
| `scheduledFor` | `TIMESTAMPTZ` | NOT NULL | When notification was supposed to fire |
| `status` | `ENUM('PENDING','SENT','FAILED','SKIPPED')` | NOT NULL, default `'PENDING'` | |
| `errorMessage` | `TEXT` | nullable | If status = FAILED |
| `sentAt` | `TIMESTAMPTZ` | nullable | |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Indexes:** `(userId, status)`, `(referenceType, referenceId)`, `(scheduledFor, status)`

---

## 4. Cascade and Deletion Rules Summary

| Parent deleted | Child table | Behavior |
|----------------|------------|----------|
| `User` | `AuthIdentity` | CASCADE |
| `User` | `RefreshSession` | CASCADE |
| `User` | `AcademicPeriod` | CASCADE |
| `User` | `Subject` | CASCADE |
| `User` | `ClassSession` | CASCADE |
| `User` | `Task` | CASCADE |
| `User` | `Assessment` | CASCADE |
| `User` | `GradingScheme` | CASCADE |
| `User` | `CourseGrade` | CASCADE |
| `User` | `Device` | CASCADE |
| `User` | `NotificationPreference` | CASCADE |
| `User` | `NotificationDelivery` | CASCADE |
| `AcademicPeriod` | `Subject` | CASCADE |
| `AcademicPeriod` | `ClassSession` | CASCADE (direct via `periodId` FK) **[D-02]** |
| `AcademicPeriod` | `Assessment` | CASCADE (direct via `periodId` FK) **[D-02]** |
| `Subject` | `ClassSession` | CASCADE (also cascades from period above) |
| `Subject` | `Assessment` | CASCADE (also cascades from period above) |
| `Subject` | `CourseGrade` | CASCADE |
| `Subject` | `Task` | SET NULL (`subjectId`) |
| `GradingScheme` | `GradeScaleEntry` | CASCADE |
| `GradingScheme` | `Subject.gradingSchemeId` | SET NULL |
| `GradingScheme` | `CourseGrade.schemeId` | SET NULL (snapshot values preserved) |
| `Device` | `NotificationDelivery.deviceId` | SET NULL |

> **Note on double-cascade for ClassSession and Assessment:** Both `AcademicPeriod` and `Subject` have CASCADE to these tables. When a period is deleted, both the direct `periodId` FK and the indirect path through `Subject` would trigger. Prisma handles this via FK cascade; no double-delete risk exists since the row is simply deleted once. When a subject is deleted, only the `subjectId` FK cascade fires (the period still exists). This must be tested in Phase 2 integration tests.

---

## 5. Indexes Summary

Critical composite indexes for expected query patterns:

| Table | Index | Purpose |
|-------|-------|---------|
| `User` | `email` | Login lookup |
| `AuthIdentity` | `(provider, providerAccountId)` | OAuth identity lookup |
| `RefreshSession` | `tokenHash` | Token validation |
| `RefreshSession` | `expiresAt` | Cleanup job |
| `AcademicPeriod` | `(userId, isArchived)` | Period list |
| `Subject` | `(userId, periodId)` | Subject list by period |
| `ClassSession` | `(userId, periodId, weekday)` | Today's schedule and period timetable |
| `Task` | `(userId, dueAt)` | Dashboard deadline list |
| `Task` | `(userId, completedAt)` | Incomplete tasks |
| `Assessment` | `(userId, periodId)` | Period assessment list |
| `Assessment` | `(userId, scheduledAt)` | Upcoming assessments |
| `Assessment` | `(userId, subjectId, status)` | Grade calculation |
| `CourseGrade` | `(userId, subjectId, calculatedAt DESC, createdAt DESC)` | Deterministic grade history snapshot retrieval |
| `NotificationDelivery` | `(scheduledFor, status)` | Pending dispatch |

---

## 6. Data Integrity Rules

1. **User isolation**: Every query in the API must include a `WHERE userId = $currentUser` condition. The service layer must never construct a query that returns another user's data.
2. **No implicit account merge**: Matching emails across different `AuthIdentity` rows does not grant access to either account.
3. **Grading scheme ownership**: Before linking a `GradingScheme` to a `Subject`, verify `GradingScheme.userId = req.user.id`.
4. **Historical grade snapshots**: `CourseGrade` stores computed values at the time of calculation. Changing a scheme does not automatically update historical snapshots. The unique constraint on `(userId, subjectId)` is deliberately omitted so that snapshot history is preserved.
5. **Cross-period consistency [D-02 / A-02]**: Enforced at the database engine level via composite foreign keys `FOREIGN KEY (subjectId, periodId) REFERENCES Subject(id, periodId) ON DELETE CASCADE` on both `ClassSession` and `Assessment`. In addition, the service layer derives `periodId` automatically from `Subject.periodId` during creation and rejects period alteration on update.
6. **Transitive ownership on GradeScaleEntry [I-15]**: `GradeScaleEntry` has no direct `userId`. All mutations and reads must join through `GradingScheme` and verify `GradingScheme.userId = req.user.id`.
7. **Score integrity [D-01 / A-01]**: `Assessment.maxScore` must be > 0. `rawScore` must be >= 0. `rawScore > maxScore` is permitted to support extra credit, producing an informational API warning. `status = 'COMPLETED'` strictly requires both scores to be populated.
8. **Timezone storage**: `User.timezone` is always a valid IANA timezone string. Validated at write time.

---

## 7. Out of Scope for MVP

- Holiday exception tables
- Full offline-first sync tables (e.g., change-log / event-sourcing)
- Multi-user class enrollment or shared courses
- Audit logs beyond `NotificationDelivery`
- Soft deletes
