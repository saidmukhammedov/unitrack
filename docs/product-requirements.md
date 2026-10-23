# UniTrack — Product Requirements Document

**Version:** 1.0.0  
**Date:** 2026-10-22  
**Status:** Approved for Phase 1 Implementation

---

## 1. Purpose and Scope

UniTrack is a cross-platform academic planner designed to serve both school and university students. It centralises academic periods, subjects, timetables, assignments, assessments, and grades in a single application synchronized across web and mobile.

This document covers MVP requirements only. Out-of-scope features are listed explicitly in §10.

---

## 2. Target Platforms

| Platform | Technology | Notes |
|----------|-----------|-------|
| Web | React + Vite + TypeScript | Responsive; desktop and mobile browsers |
| Android | React Native + Expo | Minimum SDK: Android 10 (API 29) |
| iOS | React Native + Expo | Minimum: iOS 15 |

All platforms share the same backend and user account; data is synchronized via the shared authenticated REST API.

---

## 3. Supported Languages (MVP)

| Code | Language | Script |
|------|----------|--------|
| `en` | English | Latin |
| `uz` | Uzbek | Latin |
| `ru` | Russian | Cyrillic |

Additional locales must be addable without architectural changes. Uzbek educational rules (grading systems, periods) are **not** hard-coded globally; they are user-configurable or locale-specific presets.

---

## 4. User Roles

MVP supports a single role: **Student**. All data is owned by and scoped to the authenticated user.

> **Assumption:** Teacher, parent, and administrator roles are explicitly out of scope for MVP. No shared course or class data exists between users.

---

## 5. Functional Requirements

### 5.1 Authentication and Account Management

| ID | Requirement |
|----|-------------|
| AUTH-01 | Users register with email and password |
| AUTH-02 | Email addresses are verified before full account access is granted |
| AUTH-03 | Users can reset a forgotten password via a time-limited email link |
| AUTH-04 | Users can sign in with Google on web, Android, and iOS |
| AUTH-05 | Multiple authentication identities may be linked to one account (email/password + Google) |
| AUTH-06 | Accounts are **not** automatically merged based only on a matching email address |
| AUTH-07 | Access tokens are short-lived; sessions are maintained with rotating refresh tokens |
| AUTH-08 | Users can view active sessions and revoke any of them |
| AUTH-09 | Users can delete their account and all associated data |
| AUTH-10 | Rate limiting is applied to login, registration, and password-reset endpoints |

### 5.2 Onboarding and User Preferences

| ID | Requirement |
|----|-------------|
| ONBOARD-01 | First-time users complete an onboarding flow: display name, institution type (school/university), and default language |
| ONBOARD-02 | Institution type determines default grading scheme presets shown during setup |
| ONBOARD-03 | Users can skip optional onboarding steps and complete them later in settings |
| PREF-01 | Language preference is persisted per account and synchronized across devices |
| PREF-02 | Users configure their IANA timezone; all timetable entries are displayed in this timezone |
| PREF-03 | Users can update display name, timezone, and language from a settings screen |

### 5.3 Academic Periods

| ID | Requirement |
|----|-------------|
| PERIOD-01 | Users create named academic periods: school years, semesters, trimesters, quarters |
| PERIOD-02 | A period has a start date and end date |
| PERIOD-03 | Periods may overlap (a user may be enrolled in multiple contexts) |
| PERIOD-04 | Subjects and assessments belong to a period |
| PERIOD-05 | Users can archive past periods; archived data remains readable |

### 5.4 Subjects and Courses

| ID | Requirement |
|----|-------------|
| SUBJ-01 | Users create subjects within a period (e.g., Mathematics, History) |
| SUBJ-02 | Each subject has a name, optional color label, and optional teacher name |
| SUBJ-03 | University subjects carry optional credit-hour values used for GPA calculation |
| SUBJ-04 | A subject references an optional grading scheme |
| SUBJ-05 | Subjects can be archived or deleted (with cascade rules per §database-design.md) |

### 5.5 Recurring Weekly Timetable

| ID | Requirement |
|----|-------------|
| TIMETABLE-01 | Users define recurring class sessions by weekday and local wall-clock start/end times |
| TIMETABLE-02 | Each session references a subject and belongs to an academic period |
| TIMETABLE-03 | Session recurrence is bounded by period start and end dates |
| TIMETABLE-04 | Users specify a valid IANA timezone; wall-clock times are interpreted in that timezone |
| TIMETABLE-05 | The dashboard derives today's schedule by evaluating recurring sessions against today's date |
| TIMETABLE-06 | Holiday exceptions and individual session overrides are **out of scope** for MVP |

### 5.6 Assignments and Tasks

| ID | Requirement |
|----|-------------|
| TASK-01 | Users create tasks with a title, optional description, optional due date/time, subject, and period |
| TASK-02 | Tasks have a completion status: pending or completed |
| TASK-03 | Tasks may be marked complete with a timestamp |
| TASK-04 | Task type is user-defined (homework, reading, project, etc.) — a free-form label or predefined enum |
| TASK-05 | Overdue and upcoming tasks are surfaced on the dashboard |
| TASK-06 | Tasks may exist without a subject (general tasks) |

### 5.7 Exams and Assessments

| ID | Requirement |
|----|-------------|
| ASSESS-01 | Users create assessments (exams, quizzes, midterms, finals, lab reports, presentations) |
| ASSESS-02 | Each assessment belongs to a subject and period |
| ASSESS-03 | Assessments have a scheduled date/time (UTC) |
| ASSESS-04 | Users record a raw score and maximum score after the assessment |
| ASSESS-05 | Assessments have a weight (percentage) within a subject's grading scheme |
| ASSESS-06 | An assessment may be in one of three states: scheduled, completed (scored), or excused |
| ASSESS-07 | Assessments without recorded scores are treated as incomplete, not as zero |

### 5.8 Grading and GPA

| ID | Requirement |
|----|-------------|
| GRADE-01 | Grading schemes are user-created and reusable across subjects |
| GRADE-02 | Each scheme defines a grading type: percentage, weighted-average, school-band, or university-GPA |
| GRADE-03 | School-band schemes map percentage ranges to letter/number grades |
| GRADE-04 | University-GPA schemes map grades to GPA points (e.g., A → 4.0) |
| GRADE-05 | Credit-weighted GPA is calculated using the documented formula (see §grading-rules.md) |
| GRADE-06 | Only assessments with recorded scores contribute to average calculations |
| GRADE-07 | Missing scores are not treated as zero unless explicitly flagged by the user |
| GRADE-08 | Changing a grading scheme version does not silently alter historical grade interpretations |
| GRADE-09 | Grading scheme configurations are preserved with a version or effective-date mechanism |

### 5.9 Dashboard

| ID | Requirement |
|----|-------------|
| DASH-01 | Dashboard shows today's class schedule derived from the recurring timetable |
| DASH-02 | Dashboard shows upcoming and overdue tasks |
| DASH-03 | Dashboard shows upcoming assessments within the next 7 days |
| DASH-04 | Dashboard shows a per-subject grade summary for the current period |
| DASH-05 | Dashboard shows overall GPA if a university grading scheme is active |
| DASH-06 | Empty states are shown with localized guidance when data is absent |

### 5.10 Notifications and Reminders

| ID | Requirement |
|----|-------------|
| NOTIF-01 | Users configure reminder lead-times for tasks (e.g., 1 hour, 1 day before due) |
| NOTIF-02 | Users configure reminder lead-times for assessments |
| NOTIF-03 | Mobile platforms receive push notifications via Expo Push Notifications |
| NOTIF-04 | Users can enable or disable notification categories (task reminders, assessment reminders) |
| NOTIF-05 | Notification preferences are persisted per account |
| NOTIF-06 | Device push tokens are registered and stored against the user account |
| NOTIF-07 | Expired or invalid device tokens are cleaned up on push failure |
| NOTIF-08 | Web push notifications are **out of scope** for MVP |

### 5.11 Synchronization and Offline Behavior

| ID | Requirement |
|----|-------------|
| SYNC-01 | All state is authoritative in PostgreSQL; clients read from the API |
| SYNC-02 | After any successful mutation, relevant cached queries are invalidated |
| SYNC-03 | The mobile app refreshes data when returning to the foreground |
| SYNC-04 | Network or server errors are surfaced with clear, localized messages |
| SYNC-05 | Unsaved form values are preserved on connection failure; forms are not cleared until a save is confirmed |
| SYNC-06 | Mutations are idempotent where feasible; safe client-driven retries are supported |
| SYNC-07 | Ambiguous network failures (request sent, response lost) are documented and handled defensively |
| SYNC-08 | Expired session errors trigger a token refresh or redirect to login |
| SYNC-09 | Full offline editing and automatic conflict resolution are **out of scope** for MVP |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | API responses for typical read operations ≤ 300 ms at p95 under normal load |
| Security | OWASP Top 10 mitigations applied; no secrets in client bundles |
| Availability | MVP target: 99.5% monthly uptime |
| Accessibility | WCAG 2.1 AA for web; follow platform accessibility guidelines on mobile |
| Privacy | No user data sold; GDPR-aware data deletion; minimal data collection |
| Maintainability | TypeScript strict mode; linting and formatting enforced in CI |
| Scalability | Database schema designed to support thousands of users without structural changes |

---

## 7. Acceptance Criteria Summary

A feature is considered complete when:
1. The feature works correctly on all three platforms (web, Android, iOS).
2. All UI strings are translated in English, Uzbek, and Russian.
3. The feature works correctly after a session expiry and re-login.
4. Error states, loading states, and empty states are handled and localized.
5. No plaintext secrets, passwords, or tokens appear in logs or client responses.

---

## 8. User Stories (Key Flows)

### Registration and Onboarding
> As a new student, I register with my email address, verify my email, choose my language and timezone, and add my first academic period and subjects so that I can start planning immediately.

### Daily Dashboard
> As a student, I open the app and immediately see today's classes, what tasks are due today, and upcoming exams so that I know what to focus on.

### Grade Tracking
> As a university student, I enter my exam scores and assignment grades so that UniTrack calculates my current GPA and I can see whether I am on track.

### Cross-Device Sync
> As a student, I add an assignment on my phone and immediately see it on the web app without manual refresh.

### Notification Reminder
> As a student, I set a reminder 1 day before an exam and receive a push notification on my phone at the correct time in my local timezone.

---

## 9. Constraints and Assumptions

| Item | Detail |
|------|--------|
| Single student per account | No multi-user collaboration in MVP |
| No LMS integration | Manual data entry only in MVP |
| No attendance tracking | Marked explicitly as out of scope |
| No AI features | Out of scope |
| Time zone handling | All API timestamps in UTC; display in user's IANA timezone |
| Data ownership | Users can only access their own data; server enforces this |
| Educational system flexibility | Grading systems are user-configured, not hard-coded per locale |

---

## 10. Out of Scope (MVP)

- Full offline editing with conflict resolution
- AI tutoring or smart suggestions
- Social or sharing features (sharing schedules, study groups)
- LMS integrations (Google Classroom, Canvas, Moodle)
- Attendance analytics or tracking
- Paid subscription tiers or in-app purchases
- Web push notifications
- Teacher or parent roles
- Holiday calendars or complex recurrence overrides
- Multi-institution or multi-profile accounts

---

## 11. Open Questions

| # | Question | Proposed Default |
|---|----------|-----------------|
| OQ-1 | Should task types be a fixed enum or free-form text? | Fixed enum with "Other" fallback; revisit post-MVP |
| OQ-2 | Should assessments within a subject have weights that must sum to 100%? | Warn if weights don't sum to 100%; do not hard-block saving |
| OQ-3 | Should archived periods still contribute to GPA calculations? | Yes, historical data always included unless user explicitly excludes a period |
| OQ-4 | What is the maximum number of active sessions per user? | 10 concurrent sessions; oldest revoked on overflow |
