# UniTrack — Implementation Roadmap

**Version:** 2.0.0  
**Date:** 2026-10-23  
**Status:** Product Reset & Evolution Plan  
**Foundation:** Built upon completed Phase 1–6 infrastructure (Monorepo, Database, Auth, Academic Engine, Notifications, Staging Deployment).

---

## Evolution Overview

The technical and staging infrastructure is completed and verified (72/72 API tests passing, Staging deployed on Vercel & Render).

The product now transitions from an institutional student planner to a **Universal Personal Productivity Platform**.

```
[ Phase 1–6: Platform Foundation ]  ──►  [ Phase 7: Universal Core Reset ]  ──►  [ Phase 8: Chronicle Experience ]
• Monorepo & Postgres Database          • Additive Domain Contracts (Habits/Goals) • Editorial Monograph UI System
• Argon2 Auth & Refresh Sessions        • Universal Today API Endpoint             • Today Command Center
• Staging Deployment (Vercel+Render)    • Non-destructive Schema Migration         • Mobile App (Expo) Parity
• 72/72 Tests & Smoke Tests Passing     • Isolate Academic Module as Extension     • Habit & Weekly Review Loops
```

---

## Phase 7 — Universal Domain Contracts & Decoupled Architecture

**Status:** Ready to Implement (Post-Approval)  
**Objective:** Decouple scheduling, tasks, and daily planning from institutional academic entities through non-destructive additions.

### Deliverables
1. **Contracts (`packages/contracts`)**:
   - `ContextSchema`: Life areas (`Work`, `Personal`, `University`, `Health`, `Startup`).
   - `ScheduleBlockSchema`: General-purpose time blocks (meetings, shifts, workouts, classes).
   - `HabitSchema` & `HabitLogSchema`: Frequency, target counts, streaks, daily check-ins.
   - `GoalSchema`: Objectives, target dates, milestones, progress tracking.
   - `TodayStreamResponseSchema`: Unified aggregation of commitments, habits, and top tasks.
2. **Database Proposal & Migration (`apps/api/prisma/schema.prisma`)**:
   - Safe additive migration adding `Context`, `ScheduleBlock`, `Habit`, `HabitLog`, and `Goal` models.
   - Zero tables dropped; existing `AcademicPeriod`, `Subject`, `Assessment`, and `GradingScheme` models preserved.
3. **API Core Services & Routes (`apps/api/src`)**:
   - `today.service.ts` & `today.controller.ts`: Aggregates the day's stream.
   - CRUD controllers for Habits, Goals, and Schedule Blocks.
   - Preserves all existing `/api/v1/academic/*` endpoints for optional academic module.

### Acceptance Criteria
- [ ] All 72 existing API tests continue to pass without regression.
- [ ] New test suite for Habits, Schedule Blocks, and Goals created and passing.
- [ ] `GET /api/v1/today` returns unified stream in ≤ 200ms.

---

## Phase 8 — "The Chronicle" Visual Design & Daily Command Center

**Status:** Design Defined  
**Objective:** Implement the distinctive "Chronicle" editorial visual system and the Daily Command Center across Web and Mobile.

### Deliverables
1. **Design System ("The Chronicle")**:
   - Modern serif typography (Newsreader / Instrument Serif) for chapter-like dates and section headings.
   - High-precision monospaced numerals (Geist Mono) for time columns and metrics.
   - Warm linen / charcoal palette (`#FBF9F4` paper canvas light, `#161514` warm charcoal dark).
   - Hairline 1px rule lines and typographic scale replacing heavy boxy cards.
2. **Web Application Rebuild (`apps/web`)**:
   - **Today View**: Morning Intentions (Top 3), Chronological Time River, In-day status logging (Attended, Completed, Postponed, Missed), Evening Closeout.
   - **Timeline View**: Visual day/week calendar supporting all commitments.
   - **Habits & Goals View**: Streaks, visual completion momentum.
   - **Optional Academic Hub**: Dedicated workspace for GPA, Course Credits, and Exam grade scales.
3. **Mobile Parity (`apps/mobile`)**:
   - Expo SDK 52 interface adhering to the Chronicle pocket notebook design.
   - Thumb-friendly swipe actions to stamp completion or postpone.

---

## Phase 9 — Habit Streaks, Weekly Review & Multi-Platform Sync

**Status:** Planned  
**Objective:** Institutionalize the retention loop through the Sunday Weekly Review and offline synchronization.

### Deliverables
1. **Weekly Review Engine**: Retrospective analytics comparing planned commitments vs. actual execution.
2. **Offline Optimistic Storage**: Client-side offline cache with background conflict resolution for mobile and web.
3. **Smart Reminders**: Push notification worker delivering timely alerts for upcoming time blocks and habit reminders.
