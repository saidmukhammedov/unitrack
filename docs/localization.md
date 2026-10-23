# UniTrack — Localization Strategy

**Version:** 1.0.0  
**Date:** 2026-10-22  
**Status:** Approved for Phase 5 Implementation

---

## 1. Overview

UniTrack supports three languages in the MVP:

| Code | Language | Script | Notes |
|------|----------|--------|-------|
| `en` | English | Latin | Default fallback language |
| `uz` | Uzbek | Latin | Uzbek Latin script (not Cyrillic) |
| `ru` | Russian | Cyrillic | |

The localization system is designed for future expansion. Adding a new locale must not require architectural changes — only new translation files and locale data.

---

## 2. Library and Framework

| Platform | i18n Library | Notes |
|----------|-------------|-------|
| Web (`apps/web`) | `react-i18next` + `i18next` | Widely adopted; Zod integration available |
| Mobile (`apps/mobile`) | `react-i18next` + `i18next` | Same API as web; Expo-compatible |
| Shared resources | `packages/i18n` | Translation JSON files and Intl formatters |

**Decision:** Using `react-i18next` on both platforms allows the same translation key structure, the same date/number formatter utilities, and the same `packages/i18n` resource package.

---

## 3. Translation Resource Structure

Translation files live in `packages/i18n/locales/`. Each locale has one file per namespace.

```
packages/i18n/
├── locales/
│   ├── en/
│   │   ├── common.json      # Shared strings: buttons, labels, errors
│   │   ├── auth.json        # Login, register, verify, reset
│   │   ├── onboarding.json  # Onboarding flow strings
│   │   ├── dashboard.json   # Dashboard-specific strings
│   │   ├── periods.json
│   │   ├── subjects.json
│   │   ├── timetable.json
│   │   ├── tasks.json
│   │   ├── assessments.json
│   │   ├── grades.json
│   │   ├── settings.json
│   │   └── notifications.json
│   ├── uz/
│   │   └── … (same structure)
│   └── ru/
│       └── … (same structure)
├── formatters.ts            # Intl-based date, time, number formatters
├── index.ts                 # Exports resources and locale list
└── types.ts                 # TypeScript types for translation keys
```

**No hard-coded strings** may appear in component files. Every user-visible string must reference a translation key.

---

## 4. Key Naming Convention

Keys follow a hierarchical dot notation. Format: `namespace.section.element`

```json
// tasks.json (en)
{
  "page": {
    "title": "My Tasks",
    "emptyState": {
      "heading": "No tasks yet",
      "description": "Add your first task to get started.",
      "action": "Add Task"
    }
  },
  "form": {
    "title": {
      "label": "Title",
      "placeholder": "e.g., Math homework chapter 5",
      "error": {
        "required": "Title is required.",
        "maxLength": "Title must be 255 characters or fewer."
      }
    },
    "dueDate": {
      "label": "Due Date",
      "placeholder": "Select a date"
    },
    "type": {
      "label": "Type",
      "options": {
        "HOMEWORK": "Homework",
        "READING": "Reading",
        "PROJECT": "Project",
        "LAB": "Lab",
        "PRESENTATION": "Presentation",
        "OTHER": "Other"
      }
    },
    "submit": "Save Task",
    "cancel": "Cancel"
  },
  "status": {
    "pending": "Pending",
    "completed": "Completed",
    "overdue": "Overdue"
  }
}
```

**Uz equivalent (sample):**
```json
{
  "page": {
    "title": "Mening vazifalarim",
    "emptyState": {
      "heading": "Hozircha vazifalar yo'q",
      "description": "Boshlash uchun birinchi vazifangizni qo'shing.",
      "action": "Vazifa qo'shish"
    }
  }
}
```

---

## 5. Namespace Coverage Requirements

All translatable content must be covered, including:

| Category | Namespace | Examples |
|----------|-----------|---------|
| Navigation | `common` | Tab labels, back buttons, menus |
| Forms | Per-feature namespace | Field labels, placeholders, validation messages |
| Validation errors | Per-feature namespace | "Required", "Invalid email", "Max length exceeded" |
| Empty states | Per-feature namespace | "No subjects yet", dashboard empty states |
| Push notifications | `notifications` | Notification body text |
| Server error messages | `common.errors` | "Something went wrong", "Session expired" |
| Confirmation dialogs | `common.dialogs` | "Are you sure?", "This action cannot be undone." |
| Enum labels | Per-feature namespace | Task types, assessment types, period types |
| Date/time labels | `common.datetime` | "Today", "Tomorrow", weekday names |
| Onboarding | `onboarding` | Step titles, descriptions, CTA labels |

---

## 6. Language Selection and Persistence

### 6.1 First Launch

1. Read the device/browser language using platform APIs:
   - **Web:** `navigator.language` or `navigator.languages[0]`
   - **Mobile:** `expo-localization` `getLocales()[0].languageCode`
2. Match against supported locales: `['en', 'uz', 'ru']`
3. If a match is found, use it. Otherwise, default to `'en'`.
4. Display this as the pre-selected language in the onboarding flow.

### 6.2 Authenticated Users

- Language preference is stored in `User.languageCode` in the database.
- On login, the client reads `languageCode` from the user profile response and initializes i18next accordingly.
- Language changes in Settings: call `PATCH /api/v1/users/me` with `{ languageCode: 'uz' }`, then reinitialize i18next.
- Language is synchronized across devices through the user profile.

### 6.3 Unauthenticated Users

- Language selection during onboarding is stored in device-local storage (AsyncStorage on mobile, localStorage on web).
- After registration, the selected language is sent with the registration payload.

---

## 7. Date, Time, and Number Formatting

All formatting uses the JavaScript `Intl` API. Formatters live in `packages/i18n/formatters.ts`.

### 7.1 Date Formats

| Locale | Short Date | Long Date | Example (Short) |
|--------|-----------|----------|----------------|
| `en` | MM/DD/YYYY | Month D, YYYY | 10/22/2026 |
| `uz` | DD.MM.YYYY | D-MMMM YYYY | 22.10.2026 |
| `ru` | DD.MM.YYYY | D MMMM YYYY г. | 22.10.2026 |

Dates are formatted using `Intl.DateTimeFormat` with the user's IANA timezone for local display.

### 7.2 Time Formats

- `en`: 12-hour clock (`2:30 PM`)
- `uz`: 24-hour clock (`14:30`)
- `ru`: 24-hour clock (`14:30`)

Users may override the time format preference in settings (out of scope for MVP; defaulted by locale).

### 7.3 Number Formats

| Locale | Decimal Separator | Thousands Separator | Example |
|--------|------------------|--------------------|----|
| `en` | `.` | `,` | 1,234.56 |
| `uz` | `,` | ` ` | 1 234,56 |
| `ru` | `,` | ` ` | 1 234,56 |

Grades and percentages use `Intl.NumberFormat` with `minimumFractionDigits: 2`.

---

## 8. User-Created Content

User-created content (subject names, task titles, notes, teacher names) is **never translated**. It is stored and displayed as entered. When the interface language changes, only application strings change; user data remains unaltered.

This distinction must be clear in the codebase: application strings always go through the i18n system; user data is rendered as-is.

---

## 9. Translation Completeness Policy

- All keys in `en/` are the canonical reference.
- Missing keys in `uz/` or `ru/` fall back to `en/`.
- Missing keys in production log a warning (not an error). A CI check flags missing translations before release.
- Translation completeness is a release acceptance criterion: `uz` and `ru` must be 100% translated at launch.

---

## 10. Notification Localization

Push notification bodies are generated server-side and must be localized.

- The server reads `User.languageCode` when generating notification text.
- Notification templates are stored in `packages/i18n/locales/{lang}/notifications.json`.
- The server imports these templates at runtime using the same key structure as the client.
- Variable interpolation uses i18next's `{{variable}}` syntax.

**Example notification template (`en`):**
```json
{
  "taskReminder": {
    "title": "Task Due Soon",
    "body": "\"{{taskTitle}}\" is due in {{leadTime}}."
  },
  "assessmentReminder": {
    "title": "Upcoming Assessment",
    "body": "\"{{assessmentTitle}}\" in {{subjectName}} is in {{leadTime}}."
  }
}
```

**Ru equivalent:**
```json
{
  "taskReminder": {
    "title": "Срок задания истекает",
    "body": "Задание \"{{taskTitle}}\" нужно сдать через {{leadTime}}."
  },
  "assessmentReminder": {
    "title": "Предстоящая проверка",
    "body": "\"{{assessmentTitle}}\" по предмету {{subjectName}} через {{leadTime}}."
  }
}
```

---

## 11. RTL Support

- `en`, `uz` (Latin), and `ru` are all LTR (left-to-right) scripts.
- RTL support is **not required** for the MVP.
- The codebase must not hard-code directional assumptions (e.g., avoid hardcoded `margin-left`; prefer `margin-inline-start` where web standards allow) to reduce future RTL migration cost.

---

## 12. Implementation Checklist (Phase 5)

- [ ] `packages/i18n` package initialized with all three locale files
- [ ] `react-i18next` configured in `apps/web` with lazy-loaded namespaces
- [ ] `react-i18next` configured in `apps/mobile`
- [ ] `formatters.ts` implemented with `Intl` wrappers tested for all three locales
- [ ] Device language detection implemented in both apps
- [ ] Language preference persisted to `User.languageCode` via API
- [ ] Language selector present in onboarding and settings on all platforms
- [ ] All application strings use translation keys (no hard-coded UI text)
- [ ] Server-side notification templates translated in all three languages
- [ ] CI lint rule added to detect untranslated strings (optional for MVP)
- [ ] Manual QA walkthrough of all three locales on web, Android, and iOS

---

## 13. Open Questions

| # | Question | Proposed Default |
|---|----------|-----------------|
| L-OQ1 | Should `uz` use formal or informal address? | Formal (`siz`) for MVP |
| L-OQ2 | Uzbek number formatting convention for grades — should percentages use `,` or `.`? | Follow `Intl.NumberFormat('uz')` output |
| L-OQ3 | How should the app handle a user changing language mid-session — immediate or after restart? | Immediate, no restart required |
