# UniTrack — Product Requirements Document

**Version:** 2.0.0  
**Date:** 2026-10-23  
**Status:** Product Reset & Evolution  
**Core Principle:** Build for the person, not the institution.

---

## 1. Vision and Purpose

UniTrack is a universal personal productivity platform that helps people organize their lives, manage commitments, build habits, pursue goals, and turn intentions into action.

It serves school students, university students, employees, freelancers, independent learners, and anyone seeking to manage their time and progress. Affiliation with an educational institution is **never required**. Academic functionality (terms, course credits, GPA) is an optional layer, not the foundation of the product.

UniTrack is designed to be valuable to open every day:
- Clarifying what deserves attention today.
- Tracking scheduled activities, tasks, deadlines, and recurring commitments.
- Recording actuals: what was completed, attended, postponed, or missed.
- Fostering habit consistency and long-term goal realization.
- Closing the loop between intentions and reality through daily and weekly reviews.
- Seamless synchronization across Web, iOS, and Android.

---

## 2. Target Platforms & Stack

| Platform | Technology | Deployment / Environment |
|:---|:---|:---|
| **Web** | React 18 + Vite + TypeScript | Vercel SPA (`https://unitrack-web-staging.vercel.app`) |
| **Mobile (Android/iOS)** | React Native + Expo SDK 52 | EAS Build profile / Expo Go |
| **Backend API** | Node.js + Express + Prisma ORM | Render Staging (`https://unitrack-api-staging.onrender.com`) |
| **Database** | PostgreSQL (Neon Serverless) | Free Tier Staging Instance |

---

## 3. Supported Languages

| Code | Language | Script | Status |
|:---|:---|:---|:---|
| `en` | English | Latin | Active |
| `uz` | Uzbek | Latin | Active |
| `ru` | Russian | Cyrillic | Active |

All interfaces and notifications are localized using `@unitrack/i18n`.

---

## 4. Universal User Model & Contexts

All data is personal and owned exclusively by the authenticated individual.

Users organize their life into optional **Life Contexts** (e.g. `Personal`, `Work`, `University`, `Tutoring`, `Fitness`, `Side Project`).

---

## 5. Functional Requirements

### 5.1 Authentication & Security (Active & Preserved)
| ID | Requirement | Status |
|:---|:---|:---|
| AUTH-01 | Register with email and password with immediate verified access | Implemented |
| AUTH-02 | Sign in with Google (OAuth2 with fallback staging support) | Implemented |
| AUTH-03 | Short-lived access tokens with rotating HttpOnly refresh cookies | Implemented |
| AUTH-04 | Active session inspection and remote revocation | Implemented |
| AUTH-05 | GDPR-compliant account deletion cascading all personal data | Implemented |

### 5.2 The Daily Command Center (Core Engine)
| ID | Requirement | Priority |
|:---|:---|:---|
| DAY-01 | **Today View**: Unified chronological stream combining scheduled commitments, daily habits, and priority tasks | P0 |
| DAY-02 | **Daily Intentions**: Top 3 focus items highlighted at the start of each day | P0 |
| DAY-03 | **Status Recording (Actuals)**: Record whether an activity was *Attended*, *Completed*, *Postponed*, or *Missed* | P0 |
| DAY-04 | **Evening Closeout**: Guided 2-minute wrap-up reviewing completed items and rolling forward uncompleted tasks | P1 |

### 5.3 Commitments & Time Blocks (Core Engine)
| ID | Requirement | Priority |
|:---|:---|:---|
| TIME-01 | Create fixed time blocks (work shifts, meetings, classes, appointments, workouts) | P0 |
| TIME-02 | Weekday recurring patterns or specific date instances | P0 |
| TIME-03 | Local wall-clock time evaluation respecting user IANA timezone | P0 |
| TIME-04 | Tagging with optional Life Context (e.g. `Work`, `Personal`, `University`) | P1 |

### 5.4 Tasks & Deadlines (Core Engine)
| ID | Requirement | Priority |
|:---|:---|:---|
| TASK-01 | Create tasks with title, description, priority, due date/time, and context tag | P0 |
| TASK-02 | Subtasks and milestone checklists | P1 |
| TASK-03 | Task categorization: *Task*, *Reading*, *Project*, *Errand*, *Homework* | P0 |
| TASK-04 | Overdue items highlighted with quick-postpone or reschedule action | P0 |

### 5.5 Habits & Daily Routines (Core Engine)
| ID | Requirement | Priority |
|:---|:---|:---|
| HABIT-01 | Create frequency-based habits (Daily, Weekdays, Custom weekly frequency) | P0 |
| HABIT-02 | Daily completion logging with streak counting | P0 |
| HABIT-03 | Integration into Today timeline stream | P0 |

### 5.6 Goals & Progress Tracking (Core Engine)
| ID | Requirement | Priority |
|:---|:---|:---|
| GOAL-01 | Define high-level goals with target dates and optional context | P1 |
| GOAL-02 | Break goals into milestones or link to ongoing habits/tasks | P1 |
| GOAL-03 | Visual progress calculation based on milestone completion | P1 |

### 5.7 Weekly Review (Retention Loop)
| ID | Requirement | Priority |
|:---|:---|:---|
| REV-01 | Weekly retrospective comparing planned commitments vs. actual execution | P1 |
| REV-02 | Habit adherence rate and task completion analytics | P1 |
| REV-03 | Guided weekly planning for upcoming week | P2 |

### 5.8 Optional Academic Extension (Decoupled Module)
| ID | Requirement | Priority |
|:---|:---|:---|
| ACAD-01 | Manage Academic Periods (Semesters, Trimesters, School Years) | Optional Extension |
| ACAD-02 | Manage Subjects, Courses, and Credit Hours | Optional Extension |
| ACAD-03 | Record Assessment Scores (Exams, Quizzes, Midterms) with custom weights | Optional Extension |
| ACAD-04 | Dynamic cumulative GPA (4.0 scale) and weighted grade band calculation | Optional Extension |

---

## 6. Non-Functional Requirements
- **Performance**: p95 API response times ≤ 300 ms.
- **Privacy**: No tracking or data selling. All personal commitments remain private.
- **Visual Identity**: Distinctive, intentional editorial design (**The Chronicle**); strictly avoiding generic card-grid SaaS defaults.
- **Mobile First**: Native feel on mobile browsers and Expo mobile app.
