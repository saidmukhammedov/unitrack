# UniTrack — Grading Rules and Calculation Specification

**Version:** 1.0.0  
**Date:** 2026-10-22  
**Status:** Approved — implementation deferred to Phase 5

---

## 1. Purpose

This document defines every grading concept, formula, and edge-case rule used by UniTrack. It is the authoritative specification for the `packages/academic-core` library. No grading logic may be implemented that contradicts this document without an explicit revision.

---

## 2. Grading Concepts

### 2.1 Terminology

| Term | Definition |
|------|-----------|
| **Raw score** | The actual points a student received on an assessment (e.g., 78) |
| **Maximum score** | The total possible points for an assessment (e.g., 100) |
| **Percentage grade** | `(rawScore / maxScore) × 100`, rounded to 2 decimal places |
| **Weight** | A decimal proportion (0.0–1.0) or a percentage (0–100%) expressing how much an assessment contributes to the subject total |
| **Weighted average** | A weighted mean of percentage grades across assessments |
| **Grade band** | A named letter or symbol grade mapped from a percentage range (e.g., 90–100 → A) |
| **Grade points** | A numeric value associated with a grade band for GPA calculation (e.g., A → 4.0) |
| **Credit hours** | The unit of academic weight assigned to a university course |
| **GPA** | Credit-weighted grade-point average across all courses in scope |
| **Missing grade** | An assessment that exists in `scheduled` state with no recorded score |
| **Zero grade** | A completed assessment where the student explicitly scored 0 |
| **Incomplete assessment** | An assessment in `scheduled` state (where scores are not yet recorded) |
| **Excused assessment** | An assessment excluded from calculations by the user |

### 2.2 Assessment States

```
scheduled ──▶ completed (with rawScore & maxScore)
         ╰──▶ excused
```

- `scheduled`: Assessment has a scheduled date but no score recorded. Treated as **incomplete**; excluded from averages. An assessment taken whose score is not yet entered remains in `scheduled` state.
- `completed`: Both `rawScore` and `maxScore` have been recorded. Included in calculations.
- `excused`: Explicitly excluded. Weight is redistributed proportionally or ignored (see §3.3).

---

## 3. Calculation Formulas

### 3.1 Percentage Grade

**Formula:**
```
percentageGrade = (rawScore / maxScore) × 100
```

**Preconditions [A-01]:**
- `maxScore > 0`: validated strictly (error if zero or negative across DB, API, and calculation engine).
- `rawScore >= 0`: validated strictly (error if negative).
- `rawScore > maxScore`: allowed for bonus points / extra credit (produces a percentage > 100%, e.g., 105.00%; API and UI surface an informational warning notice, but calculation succeeds).

**Output:** Rounded to 2 decimal places.

**Example:**
> Raw score: 47, Max score: 60  
> Percentage = (47 / 60) × 100 = **78.33%**

---

### 3.2 Subject Weighted Average

A subject's current grade is the weighted average of all **completed** assessments.

**Formula:**
```
subjectAverage = Σ(percentageGrade_i × weight_i) / Σ(weight_i)
```

Where the sum is over all completed (scored, non-excused) assessments.

**Weight normalization:** Weights are always normalized against the sum of weights of *included* assessments. This means:
- Incomplete assessments do not drag the average down.
- Excused assessments are excluded and do not affect the denominator.
- If no assessments are completed, `subjectAverage` = `null` (not 0).

**Weight input validation:**
- Each weight must be ≥ 0.
- The sum of all assessment weights for a subject is expected to equal 1.0 (100%). The UI warns if the sum differs from 1.0 by more than 0.001, but the server does not reject such configurations.
- Weights may be stored as integers (e.g., 30 for 30%) and normalized internally.

**Example:**

| Assessment | Raw | Max | % Grade | Weight |
|-----------|-----|-----|---------|--------|
| Quiz 1 | 18 | 20 | 90.00% | 0.10 |
| Midterm | 72 | 100 | 72.00% | 0.30 |
| Lab Report | — | 50 | (missing) | 0.20 |
| Final Exam | 85 | 100 | 85.00% | 0.40 |

Completed assessments: Quiz 1, Midterm, Final Exam  
Sum of included weights: 0.10 + 0.30 + 0.40 = **0.80**

```
subjectAverage = (90.00 × 0.10 + 72.00 × 0.30 + 85.00 × 0.40) / 0.80
              = (9.00 + 21.60 + 34.00) / 0.80
              = 64.60 / 0.80
              = 80.75%
```

> Note: The Lab Report is missing and is excluded. The denominator is 0.80, not 1.00.

---

### 3.3 Excused Assessment Handling

When an assessment is marked `excused`:
- Its weight is removed from both the numerator and denominator.
- This is equivalent to the assessment not existing for calculation purposes.
- The remaining assessment weights are **not** automatically rescaled to sum to 1.0. The normalized division (§3.2) handles this correctly without renormalization.

---

### 3.4 Grade Band Mapping (School Grading)

A `GradingScheme` of type `SCHOOL_BAND` defines an ordered list of `GradeScaleEntry` records:

```
GradeScaleEntry {
  minPercentage: number   // inclusive lower bound
  maxPercentage: number   // inclusive upper bound (100 for top band)
  label: string           // e.g., "A", "5", "Excellent"
  gradePoints: number | null  // optional; for schemes that also support GPA
}
```

**Band assignment rule:** Given a `percentageGrade`, find the entry where:
```
entry.minPercentage <= percentageGrade <= entry.maxPercentage
```

Bands must be non-overlapping and cover [0, 100] without gaps. This is validated at scheme creation.

**Example — Uzbekistan school grading (user-configured preset):**

| Band Label | Min % | Max % | Grade Points |
|-----------|-------|-------|-------------|
| 5 (Excellent) | 90 | 100 | — |
| 4 (Good) | 70 | 89 | — |
| 3 (Satisfactory) | 50 | 69 | — |
| 2 (Unsatisfactory) | 0 | 49 | — |

> **Important:** This is a sample preset, not a hard-coded rule. Users can customize, rename, or replace it.

**Example — US Letter Grade (university preset):**

| Band Label | Min % | Max % | Grade Points |
|-----------|-------|-------|-------------|
| A | 93 | 100 | 4.0 |
| A- | 90 | 92 | 3.7 |
| B+ | 87 | 89 | 3.3 |
| B | 83 | 86 | 3.0 |
| B- | 80 | 82 | 2.7 |
| C+ | 77 | 79 | 2.3 |
| C | 73 | 76 | 2.0 |
| C- | 70 | 72 | 1.7 |
| D+ | 67 | 69 | 1.3 |
| D | 60 | 66 | 1.0 |
| F | 0 | 59 | 0.0 |

---

### 3.5 Credit-Weighted GPA

**Applicable scheme type:** `UNIVERSITY_GPA`

**Preconditions:**
1. The subject's grading scheme includes `gradePoints` values in `GradeScaleEntry`.
2. The subject has a positive `creditHours` value.
3. The subject has a calculable `subjectAverage` (at least one completed assessment).

**Formula:**
```
GPA = Σ(gradePoints_i × creditHours_i) / Σ(creditHours_i)
```

Where the sum is over all subjects in scope (e.g., current period) that satisfy the preconditions above.

**Step-by-step:**
1. Compute `subjectAverage` (§3.2) for each subject.
2. Map `subjectAverage` to a `GradeScaleEntry` → obtain `gradePoints`.
3. Multiply `gradePoints × creditHours` for each subject.
4. Sum the products and divide by total credits.

**Result:** Rounded to 2 decimal places.

**Example:**

| Subject | Credits | Subject Avg | Grade Band | Grade Points | Points × Credits |
|---------|---------|-------------|-----------|-------------|-----------------|
| Mathematics | 4 | 88.0% | B+ | 3.3 | 13.2 |
| History | 3 | 76.0% | C | 2.0 | 6.0 |
| Physics | 4 | 92.0% | A- | 3.7 | 14.8 |
| Literature | 2 | 61.0% | D | 1.0 | 2.0 |

```
GPA = (13.2 + 6.0 + 14.8 + 2.0) / (4 + 3 + 4 + 2)
    = 36.0 / 13
    = 2.77
```

**Subjects excluded from GPA:**
- Subjects with no completed assessments (no `subjectAverage`).
- Subjects assigned a grading scheme without `gradePoints` mappings.
- Subjects with `creditHours` ≤ 0 or null.
- Subjects explicitly excluded by the user.

**When GPA cannot be calculated:** Return `null` with a descriptive reason. Never return 0 or a fabricated value.

---

### 3.6 Missing vs Zero Grade

| Scenario | Assessment State | Included in Average? | Value |
|----------|----------------|---------------------|-------|
| Assessment not yet taken | `scheduled` | No | — |
| Assessment taken, score entered as 0 | `completed`, rawScore = 0 | Yes | 0.00% |
| Assessment taken, score not yet entered | `scheduled` | No (treated as incomplete) | — |
| Assessment excused | `excused` | No | — |

> **Rule:** The system **never** infers a zero score. A zero must be explicitly recorded by the user. Transitioning to `completed` requires both `rawScore` and `maxScore` to be provided simultaneously.

---

### 3.7 Scheme Types Summary

UniTrack supports four scheme types (`GradingScheme.schemeType`):

1. **`PERCENTAGE`**: Calculates raw percentage score per assessment (§3.1) and simple arithmetic subject averages.
2. **`WEIGHTED_AVERAGE` [I-14]**: Computes normalized weighted mean of percentage grades across assessments (§3.2). Produces a numeric percentage output only (e.g. `82.50%`). Does not map to letter/band symbols and has no `GradeScaleEntry` children.
3. **`SCHOOL_BAND`**: Uses weighted assessment averages (§3.2) and maps the resulting percentage to discrete named letter/number bands (§3.4) defined in `GradeScaleEntry`.
4. **`UNIVERSITY_GPA`**: Uses weighted assessment averages (§3.2), maps percentages to grade bands with assigned `gradePoints` (§3.4), and computes credit-weighted GPA (§3.5).

---

## 4. Grading Scheme Versioning and Historical Snapshots

### Problem
A student's historical grades must remain interpretable even if the grading scheme changes (e.g., grade boundaries are adjusted mid-year).

### MVP Solution — [D-03 / D-04]

1. **Informational Scheme Versions**: `GradingScheme` records carry a `version` integer. When a scheme's entries or boundaries are modified, `version` is incremented.
2. **Authoritative Immutable Grade Snapshots [A-03]**: Historical grade interpretation is preserved via the snapshot columns in `CourseGrade`:
   - `computedPercentage` (snapshot of subject percentage average)
   - `computedBand` (snapshot of mapped band label)
   - `computedGradePoints` (snapshot of GPA points)
   - `assessmentsIncluded` (count of scored assessments evaluated)
   - `assessmentsExcluded` (count of incomplete/excused assessments omitted)
   - `totalWeight` (sum of weights of included assessments)
   - `schemeId` & `schemeVersion` (metadata identifying the scheme version applied)
   - `calculatedAt` & `createdAt` (instant timestamps)
3. **Deterministic Retrieval & Append-Only History [A-03]**: The table has no unique constraint on `(userId, subjectId)`. Each calculation appends a new snapshot row. The current grade is always retrieved with deterministic tie-breaking:
   ```sql
   ORDER BY calculatedAt DESC, createdAt DESC, id DESC LIMIT 1
   ```
4. **Auditability vs. Reproducibility [A-03]**:
   - `CourseGrade` snapshots provide an **explainable historical audit transcript**: they prove what grade was awarded, under which scheme version, and with what assessment counts and total weight.
   - Snapshots do **not** freeze the individual raw scores or titles of past assessments. If a student later modifies an assessment from a past semester, historical `CourseGrade` rows are **not altered**. Running a new calculation creates a *new* snapshot. Exact mathematical reproduction of a historical calculation is only possible if the underlying assessment rows have not been changed.
5. **Recalculation Policy**: Modifying a scheme does **not** silently overwrite past `CourseGrade` snapshots. Past terms remain locked to their historical values. Users may trigger manual recalculation if desired, which appends a new snapshot with the updated `calculatedAt` and new scheme version.

---

## 5. Validation Rules Summary

| Rule | Error Condition | Behavior |
|------|----------------|---------|
| maxScore must be positive | `maxScore <= 0` | Reject with validation error |
| rawScore must be non-negative | `rawScore < 0` | Reject with validation error |
| rawScore exceeds maxScore | `rawScore > maxScore` | Warn; do not reject |
| Weight must be non-negative | `weight < 0` | Reject |
| Weights don't sum to 1.0 | `abs(Σweight - 1.0) > 0.001` | Warn; do not reject |
| Grade band gaps | Uncovered percentage in [0,100] | Reject scheme at creation |
| Grade band overlaps | Two entries claim same percentage | Reject scheme at creation |
| GPA without credit hours | `creditHours` is null or ≤ 0 | Exclude subject; return `null` GPA note |
| GPA without grade points | Scheme lacks `gradePoints` | Exclude subject; return `null` GPA note |
| Division by zero | All assessments incomplete | Return `null` for subject average |

---

## 6. Implementation Notes (for Phase 5)

- All calculation functions in `packages/academic-core` must be pure functions.
- Each function must accept typed inputs (from `packages/contracts`) and return typed outputs or a typed error.
- Precision: use integer arithmetic where possible; represent percentages as numbers rounded to 2 decimal places at output only.
- Do not use floating-point accumulation for GPA; accumulate integer-based scores × 100 and divide at the end.
- Unit tests must cover: all formula examples in this document, all edge cases in §3.6, all validation failures in §5.

---

## 7. Out of Scope for MVP Grading

- Automatic grade predictions or AI-driven suggestions
- Grade curve adjustments or curve calculation
- Attendance-based grade deductions
- Departmental or national grade normalization
- Export to GPA transcript format
- Integration with university registrar systems
