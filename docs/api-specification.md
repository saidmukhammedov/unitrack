# UniTrack — API Specification

**Version:** 1.0.0  
**Date:** 2026-10-22  
**Status:** Approved for Phase 3–4 Implementation

---

## 1. Conventions

### 1.1 Base URL

```
https://api.unitrack.app/api/v1
```

All endpoints are prefixed with `/api/v1`. Future breaking changes introduce `/api/v2` while the previous version is maintained during a deprecation window.

### 1.2 Authentication

All endpoints except those in §2.1 require a valid Bearer access token:

```
Authorization: Bearer <access_token>
```

The access token is a short-lived JWT (15-minute expiry). Clients must refresh silently using the refresh token when a `401` is received.

### 1.3 Content Type

All request and response bodies are `application/json` unless otherwise noted.

### 1.4 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK — successful read or update |
| 201 | Created — successful resource creation |
| 204 | No Content — successful deletion |
| 400 | Bad Request — validation failure |
| 401 | Unauthorized — missing or invalid access token |
| 403 | Forbidden — authenticated but not the owner |
| 404 | Not Found — resource does not exist or is not owned by caller |
| 409 | Conflict — duplicate resource (e.g., email already registered) |
| 422 | Unprocessable Entity — semantic validation failure |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error |

### 1.5 Error Response Schema

All errors return:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description.",
    "fields": {
      "email": ["Invalid email address."]
    }
  }
}
```

`fields` is only present on `400` validation errors. `code` is a machine-readable constant.

### 1.6 Pagination

List endpoints that may return many items use cursor-based pagination:

```
GET /api/v1/tasks?limit=20&cursor=<opaque_cursor>

Response:
{
  "data": [...],
  "meta": {
    "nextCursor": "<opaque_cursor> | null",
    "hasMore": true | false
  }
}
```

Default `limit`: 20. Maximum `limit`: 100.

### 1.7 Shared Zod Contracts

Request body schemas are defined in `packages/contracts`. Both the backend (validation) and the clients (typing) import from the same package. This document describes the schemas in human-readable form; the Zod definitions are canonical.

---

## 2. Authentication and Sessions

### 2.1 Public Endpoints (No Auth Required)

#### `POST /api/v1/auth/register`
Register a new account with email and password.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "Str0ng!Pass",
  "displayName": "Aisha Karimova",
  "languageCode": "uz"
}
```

**Validation:**
- `email`: valid RFC-5321 email, max 320 chars
- `password`: min 8 chars, at least 1 uppercase, 1 digit
- `displayName`: 1–100 chars, non-empty
- `languageCode`: one of `['en', 'uz', 'ru']`

**Response `201`:**
```json
{
  "message": "Verification email sent. Please check your inbox."
}
```

**Errors:** `409` if email already registered.

---

#### `POST /api/v1/auth/verify-email`
Verify email with token sent by email.

**Request:**
```json
{ "token": "<email_verification_token>" }
```

**Response `200`:**
```json
{ "message": "Email verified successfully." }
```

**Errors:** `400` if token invalid or expired.

---

#### `POST /api/v1/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "Str0ng!Pass"
}
```

**Response `200`:**
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "displayName": "Aisha Karimova",
    "emailVerified": true,
    "languageCode": "uz",
    "timezone": "Asia/Tashkent",
    "institutionType": "UNIVERSITY"
  }
}
```

Refresh token is set as `httpOnly; Secure; SameSite=Strict` cookie on web. Mobile clients receive it in:
```json
{ "refreshToken": "<opaque_token>" }
```
only when `X-Client-Type: mobile` header is present.

**Errors:** `401` on invalid credentials. `403` if email not verified.  
**Rate limit:** 10 attempts per IP per minute.

---

#### `POST /api/v1/auth/google`
Authenticate or register with a Google ID token.

**Request:**
```json
{ "idToken": "<google_id_token>" }
```

**Server actions:**
1. Verify the ID token against Google's public keys (issuer, audience, signature, expiry).
2. Extract `sub`, `email`, `name`, `picture`.
3. Look up `AuthIdentity` by `(provider='GOOGLE', providerAccountId=sub)`.
4. If found: return access token for existing user.
5. If not found: create new `User` + `AuthIdentity(GOOGLE)`, return access token.
6. Do **not** auto-link to an existing email/password account.

**Response `200`:**  
Same as `POST /auth/login` response.

**Errors:** `400` if token invalid.

---

#### `POST /api/v1/auth/refresh`
Obtain a new access token using the refresh token.

**Request (web):** No body; refresh token read from `httpOnly` cookie.  
**Request (mobile):**
```json
{ "refreshToken": "<opaque_token>" }
```

**Response `200`:**
```json
{
  "accessToken": "<new_jwt>"
}
```
New refresh token issued (rotation); old token invalidated.

**Errors:** `401` if refresh token missing, expired, or revoked.

---

#### `POST /api/v1/auth/forgot-password`
Request a password reset email.

**Request:**
```json
{ "email": "student@example.com" }
```

**Response `200`:** Always returns success to prevent email enumeration.  
**Rate limit:** 5 requests per email per hour.

---

#### `POST /api/v1/auth/reset-password`
Reset password using the emailed token.

**Request:**
```json
{
  "token": "<reset_token>",
  "newPassword": "NewStr0ng!Pass"
}
```

**Response `200`:** Success. All existing refresh sessions revoked.  
**Errors:** `400` if token invalid or expired.

---

### 2.2 Authenticated Session Endpoints

#### `POST /api/v1/auth/logout`
Revoke the current session's refresh token.

**Response `204`**

---

#### `GET /api/v1/auth/sessions`
List active sessions for the current user.

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "deviceInfo": "Chrome on macOS",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-10-01T09:00:00Z",
      "isCurrent": true
    }
  ]
}
```

---

#### `DELETE /api/v1/auth/sessions/:sessionId`
Revoke a specific session.

**Response `204`**  
**Errors:** `404` if session not found or not owned by caller.

---

## 3. User Profile and Preferences

#### `GET /api/v1/users/me`
Get the authenticated user's profile.

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "displayName": "Aisha Karimova",
  "avatarUrl": null,
  "emailVerified": true,
  "languageCode": "uz",
  "timezone": "Asia/Tashkent",
  "institutionType": "UNIVERSITY",
  "createdAt": "2026-09-01T00:00:00Z"
}
```

---

#### `PATCH /api/v1/users/me`
Update profile fields.

**Request (partial update):**
```json
{
  "displayName": "Aisha K.",
  "languageCode": "ru",
  "timezone": "Europe/Moscow",
  "institutionType": "UNIVERSITY"
}
```

**Validation:** All fields optional. `languageCode` must be in supported list. `timezone` must be a valid IANA timezone.  
**Response `200`:** Updated user object.

---

#### `DELETE /api/v1/users/me`
Delete account and all associated data.

**Request:**
```json
{ "confirmPassword": "Str0ng!Pass" }
```

**Response `204`**  
**Note:** All child records cascade-deleted per database design.

---

#### `POST /api/v1/users/me/change-password`
Change password for email/password accounts.

**Request:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456!"
}
```

**Response `200`**  
**Errors:** `400` if `currentPassword` incorrect or no email/password identity exists.

---

## 4. Academic Periods

#### `GET /api/v1/periods`
List the user's academic periods.

**Query params:** `?archived=false` (default), `?archived=true`, `?archived=all`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Spring 2026",
      "type": "SEMESTER",
      "startDate": "2026-02-01",
      "endDate": "2026-06-30",
      "isArchived": false,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

#### `POST /api/v1/periods`
Create an academic period.

**Request:**
```json
{
  "name": "Spring 2026",
  "type": "SEMESTER",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30"
}
```

**Validation:** `endDate >= startDate`, `type` in enum.  
**Response `201`:** Created period object.

---

#### `GET /api/v1/periods/:periodId`
Get a single period.  
**Errors:** `404` if not found or not owned.

---

#### `PATCH /api/v1/periods/:periodId`
Update a period.  
**Request:** Any subset of `{ name, type, startDate, endDate, isArchived }`.  
**Response `200`:** Updated period.

---

#### `DELETE /api/v1/periods/:periodId`
Delete a period and all its subjects, sessions, tasks, and assessments.  
**Response `204`**

---

## 5. Subjects

#### `GET /api/v1/periods/:periodId/subjects`
List subjects for a period.  
**Query params:** `?archived=false`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Mathematics",
      "colorHex": "#4A90D9",
      "teacherName": "Prof. Umarov",
      "creditHours": 4.0,
      "isArchived": false,
      "gradingSchemeId": "uuid | null"
    }
  ]
}
```

---

#### `POST /api/v1/periods/:periodId/subjects`
Create a subject.

**Request:**
```json
{
  "name": "Mathematics",
  "colorHex": "#4A90D9",
  "teacherName": "Prof. Umarov",
  "creditHours": 4.0,
  "gradingSchemeId": "uuid"
}
```

**Validation:** `name` 1–150 chars; `colorHex` must match `#[0-9A-Fa-f]{6}` if provided; `creditHours > 0` if provided; `gradingSchemeId` must be owned by caller.  
**Response `201`**

---

#### `GET /api/v1/subjects/:subjectId`
Get a single subject.

---

#### `PATCH /api/v1/subjects/:subjectId`
Update a subject.

---

#### `DELETE /api/v1/subjects/:subjectId`
Delete a subject and cascade.  
**Response `204`**

---

## 6. Timetable

#### `GET /api/v1/timetable`
Get recurring sessions for the authenticated user.

**Query params:**
- `?periodId=<uuid>` — filter by period
- `?subjectId=<uuid>` — filter by subject
- `?weekday=1` — filter by weekday (0=Sun … 6=Sat)

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "subjectId": "uuid",
      "subjectName": "Mathematics",
      "subjectColor": "#4A90D9",
      "weekday": 1,
      "startTime": "09:00",
      "endTime": "10:30",
      "location": "Room 204",
      "effectiveFrom": "2026-02-01",
      "effectiveTo": "2026-06-30"
    }
  ]
}
```

---

#### `POST /api/v1/timetable`
Create a recurring class session.

**Request:**
```json
{
  "subjectId": "uuid",
  "weekday": 1,
  "startTime": "09:00",
  "endTime": "10:30",
  "location": "Room 204",
  "effectiveFrom": "2026-02-01",
  "effectiveTo": "2026-06-30"
}
```

**Validation & Derivation [D-02 / I-18]:**
- `weekday` 0–6 (0 = Sunday, 1 = Monday … 6 = Saturday, matching JavaScript `Date.prototype.getDay()`).
- `startTime < endTime` (HH:MM 24-hour format).
- `subjectId` must be owned by the authenticated user.
- `periodId` is automatically derived by the server from `Subject.periodId` and stored directly on `ClassSession`. The client does not supply `periodId`.
**Response `201`**

---

#### `PATCH /api/v1/timetable/:sessionId`
Update a class session.

**Validation & Period Integrity [D-02 / A-02]:**
- `periodId` is immutable and cannot be provided in the request body (rejected with `400 VALIDATION_ERROR` if sent).
- If `subjectId` is changed, the server verifies the new subject belongs to the user and re-assigns `periodId = newSubject.periodId` atomically to satisfy the database compound foreign key constraint.
- `weekday` 0–6; `startTime < endTime`.

---

#### `DELETE /api/v1/timetable/:sessionId`
Delete a class session.  
**Response `204`**

---

## 7. Tasks

#### `GET /api/v1/tasks`
List tasks for the authenticated user.

**Query params:**
- `?periodId=<uuid>` — filter by period. When provided, returns tasks where `Task.periodId = :periodId` OR where `Task.subjectId` belongs to a `Subject` within that period. Tasks with both `periodId = null` and `subjectId = null` (general tasks) are excluded when `periodId` is specified, but returned when `periodId` is omitted [I-08].
- `?subjectId=<uuid>` — filter by subject
- `?completed=false` (default) | `true` | `all`
- `?dueBefore=<ISO date>` — tasks due before this date
- `?limit=20&cursor=<cursor>`

**Response `200`:** Paginated list.

---

#### `POST /api/v1/tasks`
Create a task.

**Request:**
```json
{
  "title": "Read Chapter 5",
  "description": "Focus on sections 5.3–5.5",
  "taskType": "READING",
  "subjectId": "uuid",
  "periodId": "uuid",
  "dueAt": "2026-03-15T23:59:00Z"
}
```

**Validation:** `title` 1–255 chars; `taskType` in enum; `dueAt` valid ISO datetime if provided.  
**Response `201`**

---

#### `GET /api/v1/tasks/:taskId`
Get a single task.

---

#### `PATCH /api/v1/tasks/:taskId`
Update a task, including marking complete.

**Request (marking complete):**
```json
{ "completedAt": "2026-03-14T18:00:00Z" }
```

**Request (marking incomplete):**
```json
{ "completedAt": null }
```

---

#### `DELETE /api/v1/tasks/:taskId`
Delete a task.  
**Response `204`**

---

## 8. Assessments

#### `GET /api/v1/assessments`
List assessments.

**Query params:**
- `?periodId=<uuid>`
- `?subjectId=<uuid>`
- `?status=SCHEDULED|COMPLETED|EXCUSED`
- `?scheduledAfter=<ISO date>`
- `?scheduledBefore=<ISO date>`
- `?limit=20&cursor=<cursor>`

---

#### `POST /api/v1/assessments`
Create an assessment.

**Request:**
```json
{
  "subjectId": "uuid",
  "title": "Midterm Exam",
  "assessmentType": "MIDTERM",
  "scheduledAt": "2026-03-20T10:00:00Z",
  "weight": 0.30,
  "notes": "Covers chapters 1–5"
}
```

**Validation & Derivation [D-02]:**
- `subjectId` must belong to the authenticated user.
- `periodId` is automatically derived by the server from `Subject.periodId` and stored directly on `Assessment`.
- Default status is `SCHEDULED`.
**Response `201`**

---

#### `GET /api/v1/assessments/:assessmentId`
Get a single assessment.

---

#### `PATCH /api/v1/assessments/:assessmentId`
Update an assessment, including recording scores.

**Request (recording score):**
```json
{
  "status": "COMPLETED",
  "rawScore": 78,
  "maxScore": 100
}
```

**Validation [D-01 / A-01, A-02]:**
- `maxScore`: must be > 0 (returns `400 VALIDATION_ERROR` if <= 0).
- `rawScore`: must be >= 0 (returns `400 VALIDATION_ERROR` if < 0).
- `rawScore > maxScore`: permitted to allow extra credit / bonus points. Returns `200 OK` with an informational notice `warning: "RAW_SCORE_EXCEEDS_MAX"`.
- **Enforced state transition [D-01]:** Setting `status = "COMPLETED"` strictly requires both `rawScore` and `maxScore` to be provided in the request body (or already present on the record with `maxScore > 0`). If a client requests `status = "COMPLETED"` with missing or null scores, the server returns `400 VALIDATION_ERROR`. An assessment taken without scores entered must remain in `SCHEDULED` status.
- **Period immutability [A-02]:** `periodId` cannot be updated directly. If `subjectId` is altered, the server validates the new subject's ownership and sets `periodId = newSubject.periodId` in the same transaction to maintain database compound foreign key validity.

---

#### `DELETE /api/v1/assessments/:assessmentId`
Delete an assessment.  
**Response `204`**

---

## 9. Grades and Grading Schemes

#### `GET /api/v1/grading-schemes`
List the user's grading schemes.

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "US Letter Grade",
      "schemeType": "UNIVERSITY_GPA",
      "version": 1,
      "isDefault": true,
      "entries": [
        { "id": "uuid", "label": "A", "minPercentage": 93, "maxPercentage": 100, "gradePoints": 4.0, "sortOrder": 1 }
      ]
    }
  ]
}
```

---

#### `POST /api/v1/grading-schemes`
Create a grading scheme.

**Request:**
```json
{
  "name": "US Letter Grade",
  "schemeType": "UNIVERSITY_GPA",
  "isDefault": false,
  "entries": [
    { "label": "A",  "minPercentage": 93, "maxPercentage": 100, "gradePoints": 4.0, "sortOrder": 1 },
    { "label": "A-", "minPercentage": 90, "maxPercentage": 92,  "gradePoints": 3.7, "sortOrder": 2 }
  ]
}
```

**Validation:** Entries must cover [0, 100] without gaps or overlaps.  
**Response `201`**

---

#### `PATCH /api/v1/grading-schemes/:schemeId`
Update a grading scheme. Increments `version` if grade band entries change.

---

#### `DELETE /api/v1/grading-schemes/:schemeId`
Delete a grading scheme. Subjects with this scheme have `gradingSchemeId` set to `null`.  
**Response `204`**

---

#### `GET /api/v1/subjects/:subjectId/grade`
Get the computed current grade for a subject.

**Response `200`:**
```json
{
  "subjectId": "uuid",
  "computedPercentage": 80.75,
  "computedBand": "B+",
  "computedGradePoints": 3.3,
  "assessmentsIncluded": 3,
  "assessmentsExcluded": 1,
  "totalWeight": 0.8000,
  "schemeId": "uuid",
  "schemeVersion": 1,
  "calculatedAt": "2026-10-22T18:00:00Z"
}
```

**Notes [A-03]:**
- The active grade is retrieved from `CourseGrade` using deterministic tie-breaking: `ORDER BY calculatedAt DESC, createdAt DESC, id DESC LIMIT 1`.
- Returns `null` for computed fields if insufficient data exists.
- The snapshot preserves output metrics, total accounted weight, and scheme metadata. It is an immutable audit transcript entry, not a time-travel simulation engine. Historical snapshots are never retroactively modified when older assessments change.

---

#### `GET /api/v1/periods/:periodId/gpa`
Compute GPA for all university-graded subjects in a period.

**Response `200`:**
```json
{
  "periodId": "uuid",
  "gpa": 2.77,
  "totalCredits": 13,
  "subjectSummaries": [
    {
      "subjectId": "uuid",
      "subjectName": "Mathematics",
      "creditHours": 4,
      "gradePoints": 3.3,
      "computedPercentage": 88.0,
      "computedBand": "B+"
    }
  ],
  "excludedSubjects": [
    { "subjectId": "uuid", "reason": "NO_COMPLETED_ASSESSMENTS" }
  ]
}
```

**Errors:** `422` if no subjects qualify for GPA calculation.

---

## 10. Notification Preferences

#### `GET /api/v1/notification-preferences`
Get all notification preferences for the user.

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "category": "TASK_REMINDER",
      "isEnabled": true,
      "leadTimeMinutes": 1440
    },
    {
      "id": "uuid",
      "category": "ASSESSMENT_REMINDER",
      "isEnabled": true,
      "leadTimeMinutes": 60
    }
  ]
}
```

---

#### `PATCH /api/v1/notification-preferences/:category`
Update a notification preference by category.

**Request:**
```json
{
  "isEnabled": true,
  "leadTimeMinutes": 120
}
```

**Validation:** `leadTimeMinutes > 0`; `category` in enum.  
**Response `200`**

**Reminder Scheduling Rules [I-13]:**
- Task reminders are scheduled only for tasks with a non-null `dueAt`. Tasks without a due date/time do not generate reminder dispatches.
- Assessment reminders are scheduled based on `scheduledAt`.
- All reminders calculate delivery timestamps in UTC: `scheduledFor = eventTimestamp - leadTimeMinutes`.

---

## 11. Device Registration

#### `POST /api/v1/devices`
Register a mobile device for push notifications.

**Request:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "IOS"
}
```

**Validation:** `expoPushToken` matches Expo token format; `platform` in `['IOS', 'ANDROID']`.  
**Response `201`:** Device object.  
**Note:** If the token already exists and belongs to the same user, returns `200` and updates `lastSeenAt`.  
**Errors:** `409` if the token is already registered to a *different* user.

---

#### `DELETE /api/v1/devices/:deviceId`
Unregister a device (e.g., on logout from mobile).  
**Response `204`**

---

## 12. Dashboard

#### `GET /api/v1/dashboard`
Aggregate dashboard data for the current date.

**Query params:**
- `?date=2026-10-22` (ISO calendar date).
- **Default date computation [I-12]:** When `?date` is omitted, the server computes today's local date by converting the current UTC instant to the user's IANA timezone (`User.timezone`) using a timezone-aware library (`Temporal` / `date-fns-tz`). The host server's local system time is never used. Weekday matching for `ClassSession` uses the convention 0 = Sunday … 6 = Saturday in that local date.

**Response `200`:**
```json
{
  "date": "2026-10-22",
  "todaysClasses": [
    {
      "sessionId": "uuid",
      "subjectId": "uuid",
      "subjectName": "Mathematics",
      "subjectColor": "#4A90D9",
      "startTime": "09:00",
      "endTime": "10:30",
      "location": "Room 204"
    }
  ],
  "upcomingTasks": [...],
  "overdueTasks": [...],
  "upcomingAssessments": [...],
  "gradeSummary": [...]
}
```

---

## 13. Idempotency and Safe Retries

For write operations where a network failure may result in an ambiguous outcome (request reached server, response lost):

- Clients may send an `Idempotency-Key: <uuid>` header on `POST` requests.
- The server caches the response for idempotent requests for 24 hours.
- If the same key is received again, the cached response is returned without re-executing the mutation.
- Not all endpoints are required to implement idempotency in MVP; it is prioritized for task creation, assessment creation, and device registration.

---

## 14. Rate Limiting Summary

| Endpoint Group | Limit |
|---------------|-------|
| `POST /auth/login` | 10 req/min per IP |
| `POST /auth/register` | 5 req/min per IP |
| `POST /auth/forgot-password` | 5 req/hour per email |
| `POST /auth/google` | 20 req/min per IP |
| All other authenticated endpoints | 300 req/min per user |
| All unauthenticated public endpoints | 60 req/min per IP |
