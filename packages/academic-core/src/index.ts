import type { AssessmentStatus, GradingSchemeType } from '@unitrack/contracts';

/**
 * Single assessment input for grading calculations
 */
export interface AssessmentScoreInput {
  rawScore: number | null;
  maxScore: number | null;
  weight: number;
  status: AssessmentStatus;
}

/**
 * Result of computing a subject's weighted average
 */
export interface SubjectAverageResult {
  percentage: number | null;
  totalWeight: number;
  assessmentsIncluded: number;
  assessmentsExcluded: number;
  isWeightSumNormal: boolean;
  warning?: string;
}

/**
 * Grade scale entry definition for band mapping and GPA grade points
 */
export interface GradeScaleEntryInput {
  id?: string;
  label: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoints?: number | null;
  sortOrder?: number;
}

/**
 * Input for subject evaluation in GPA calculation
 */
export interface SubjectGpaInput {
  subjectId: string;
  subjectName: string;
  creditHours: number | null;
  subjectAverage: number | null;
  schemeType: GradingSchemeType;
  scaleEntries?: GradeScaleEntryInput[];
  isUserExcluded?: boolean;
}

/**
 * Summary of an included subject in the GPA calculation
 */
export interface SubjectGpaSummary {
  subjectId: string;
  subjectName: string;
  creditHours: number;
  gradePoints: number;
  computedPercentage: number;
  computedBand: string;
}

/**
 * Details of a subject excluded from GPA calculation
 */
export interface ExcludedSubjectGpa {
  subjectId: string;
  subjectName: string;
  reason: 'NO_COMPLETED_ASSESSMENTS' | 'NO_GRADE_POINTS' | 'NO_CREDIT_HOURS' | 'USER_EXCLUDED' | 'INELIGIBLE_SCHEME';
}

/**
 * Output of the GPA calculation
 */
export interface GPAResult {
  gpa: number | null;
  totalCredits: number;
  subjectSummaries: SubjectGpaSummary[];
  excludedSubjects: ExcludedSubjectGpa[];
  reason?: string;
}

// =============================================================================
// 1. Percentage Grade Calculation (docs/grading-rules.md §3.1)
// =============================================================================

/**
 * Computes percentage grade for a single assessment:
 * percentageGrade = (rawScore / maxScore) * 100, rounded to 2 decimal places.
 *
 * Preconditions [A-01]:
 * - maxScore > 0 (strictly positive)
 * - rawScore >= 0 (non-negative)
 * - rawScore > maxScore is allowed for bonus/extra credit
 */
export function calculatePercentageGrade(rawScore: number, maxScore: number): number {
  if (typeof maxScore !== 'number' || isNaN(maxScore) || maxScore <= 0) {
    throw new Error('maxScore must be strictly greater than 0');
  }
  if (typeof rawScore !== 'number' || isNaN(rawScore) || rawScore < 0) {
    throw new Error('rawScore must be non-negative');
  }

  const percentage = (rawScore / maxScore) * 100;
  return Number(percentage.toFixed(2));
}

// =============================================================================
// 2. Subject Weighted Average Calculation (docs/grading-rules.md §3.2, §3.3)
// =============================================================================

/**
 * Computes the normalized weighted average of completed assessments:
 * subjectAverage = Σ(percentageGrade_i * weight_i) / Σ(weight_i)
 *
 * Rules:
 * - Only assessments with status = 'COMPLETED' and non-null rawScore and maxScore are included.
 * - Missing/SCHEDULED assessments are excluded from numerator and denominator.
 * - EXCUSED assessments are excluded from numerator and denominator.
 * - Explicit zero score (rawScore = 0) is included as 0.00%.
 * - If no assessments are completed, subjectAverage = null.
 * - Weights are normalized against the sum of weights of included assessments.
 */
export function calculateSubjectAverage(assessments: AssessmentScoreInput[]): SubjectAverageResult {
  let completedWeightSum = 0;
  let weightedPercentageSum = 0;
  let assessmentsIncluded = 0;
  let assessmentsExcluded = 0;
  let totalAllWeights = 0;
  let hasExtraCredit = false;

  for (const a of assessments) {
    if (a.weight < 0) {
      throw new Error('Assessment weight must be non-negative');
    }
    totalAllWeights += a.weight;

    // Inclusion rule: status === 'COMPLETED' and valid scores
    if (
      a.status === 'COMPLETED' &&
      a.rawScore !== null &&
      a.maxScore !== null &&
      a.maxScore > 0 &&
      a.rawScore >= 0
    ) {
      const percentage = calculatePercentageGrade(a.rawScore, a.maxScore);
      if (a.rawScore > a.maxScore) {
        hasExtraCredit = true;
      }
      weightedPercentageSum += percentage * a.weight;
      completedWeightSum += a.weight;
      assessmentsIncluded++;
    } else {
      assessmentsExcluded++;
    }
  }

  // Weight sum check: warn if sum of all weights differs from 1.0 (or 100 for percent weights) by > 0.001
  const isDecimalWeight = totalAllWeights <= 1.5;
  const targetSum = isDecimalWeight ? 1.0 : 100.0;
  const isWeightSumNormal =
    assessments.length === 0 || Math.abs(totalAllWeights - targetSum) <= 0.001;

  if (assessmentsIncluded === 0 || completedWeightSum <= 0) {
    return {
      percentage: null,
      totalWeight: Number(completedWeightSum.toFixed(4)),
      assessmentsIncluded: 0,
      assessmentsExcluded,
      isWeightSumNormal,
    };
  }

  const average = weightedPercentageSum / completedWeightSum;
  const roundedPercentage = Number(average.toFixed(2));

  return {
    percentage: roundedPercentage,
    totalWeight: Number(completedWeightSum.toFixed(4)),
    assessmentsIncluded,
    assessmentsExcluded,
    isWeightSumNormal,
    warning: hasExtraCredit ? 'RAW_SCORE_EXCEEDS_MAX' : undefined,
  };
}

// =============================================================================
// 3. Grade Scale Validation & Band Mapping (docs/grading-rules.md §3.4, §5)
// =============================================================================

/**
 * Validates that grade scale entries cover [0, 100] without overlaps or gaps.
 */
export function validateGradeScaleEntries(
  entries: GradeScaleEntryInput[]
): { valid: boolean; error?: string } {
  if (!entries || entries.length === 0) {
    return { valid: false, error: 'Grade scale must contain at least one entry' };
  }

  // Sort ascending by minPercentage
  const sorted = [...entries].sort((a, b) => a.minPercentage - b.minPercentage);

  // Check bounds of individual entries
  for (const entry of sorted) {
    if (entry.minPercentage < 0 || entry.maxPercentage > 100) {
      return { valid: false, error: `Entry ${entry.label} boundaries must be within [0, 100]` };
    }
    if (entry.minPercentage > entry.maxPercentage) {
      return {
        valid: false,
        error: `Entry ${entry.label} minPercentage (${entry.minPercentage}) exceeds maxPercentage (${entry.maxPercentage})`,
      };
    }
  }

  // Lowest boundary must start at 0
  if (sorted[0].minPercentage !== 0) {
    return { valid: false, error: `Grade scale lowest boundary must start at 0% (found ${sorted[0].minPercentage}%)` };
  }

  // Highest boundary must reach 100
  if (sorted[sorted.length - 1].maxPercentage !== 100) {
    return {
      valid: false,
      error: `Grade scale highest boundary must reach 100% (found ${sorted[sorted.length - 1].maxPercentage}%)`,
    };
  }

  // Check consecutive coverage (no gaps or overlaps)
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Overlap: next.minPercentage is less than current.maxPercentage (or <= for integer steps)
    if (next.minPercentage < current.maxPercentage) {
      return {
        valid: false,
        error: `Grade band overlap detected between ${current.label} (${current.minPercentage}-${current.maxPercentage}%) and ${next.label} (${next.minPercentage}-${next.maxPercentage}%)`,
      };
    }

    // Gap: next.minPercentage is greater than current.maxPercentage + 1
    // (allows continuous floats where next.min == current.max, or discrete integers where next.min == current.max + 1)
    if (next.minPercentage > current.maxPercentage + 1) {
      return {
        valid: false,
        error: `Grade band gap detected between ${current.label} (up to ${current.maxPercentage}%) and ${next.label} (starts at ${next.minPercentage}%)`,
      };
    }
  }

  return { valid: true };
}

/**
 * Maps a percentage grade to a GradeScaleEntry.
 * Rule: entry.minPercentage <= percentageGrade <= entry.maxPercentage.
 * If percentage exceeds 100% (extra credit), maps to top band.
 * If percentage is between discrete integer boundaries (e.g. 89.5), resolves to closest band.
 */
export function mapPercentageToBand(
  percentage: number,
  entries: GradeScaleEntryInput[]
): GradeScaleEntryInput | null {
  if (!entries || entries.length === 0) return null;

  // Extra credit: clamp to top band
  if (percentage >= 100) {
    const topEntry = [...entries].sort((a, b) => b.maxPercentage - a.maxPercentage)[0];
    return topEntry;
  }

  // Below 0: clamp to bottom band
  if (percentage <= 0) {
    const bottomEntry = [...entries].sort((a, b) => a.minPercentage - b.minPercentage)[0];
    return bottomEntry;
  }

  // Exact inclusive match
  const exact = entries.find(
    (e) => percentage >= e.minPercentage && percentage <= e.maxPercentage
  );
  if (exact) return exact;

  // If discrete boundaries (e.g., 89 and 90) and percentage has decimals (e.g., 89.6),
  // round to nearest integer to find band
  const rounded = Math.round(percentage);
  const roundedMatch = entries.find(
    (e) => rounded >= e.minPercentage && rounded <= e.maxPercentage
  );
  if (roundedMatch) return roundedMatch;

  // Fallback to highest band whose minPercentage <= percentage
  const matchingCandidates = entries
    .filter((e) => e.minPercentage <= percentage)
    .sort((a, b) => b.minPercentage - a.minPercentage);

  return matchingCandidates[0] || entries[0];
}

// =============================================================================
// 4. Credit-Weighted GPA Calculation (docs/grading-rules.md §3.5)
// =============================================================================

/**
 * Computes credit-weighted GPA across university subjects:
 * GPA = Σ(gradePoints_i * creditHours_i) / Σ(creditHours_i)
 *
 * Preconditions:
 * 1. The subject's grading scheme includes gradePoints in GradeScaleEntry.
 * 2. The subject has positive creditHours (> 0).
 * 3. The subject has a calculable subjectAverage (at least one completed assessment).
 *
 * Uses integer accumulation (points * 100 * credits) to prevent IEEE-754 precision drift.
 */
export function calculateGPA(subjects: SubjectGpaInput[]): GPAResult {
  const subjectSummaries: SubjectGpaSummary[] = [];
  const excludedSubjects: ExcludedSubjectGpa[] = [];

  let accumulatedWeightedPointsTimes100 = 0;
  let totalCredits = 0;

  for (const s of subjects) {
    // Check exclusion: user excluded
    if (s.isUserExcluded) {
      excludedSubjects.push({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        reason: 'USER_EXCLUDED',
      });
      continue;
    }

    // Check exclusion: no completed assessments / no average
    if (s.subjectAverage === null || s.subjectAverage === undefined) {
      excludedSubjects.push({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        reason: 'NO_COMPLETED_ASSESSMENTS',
      });
      continue;
    }

    // Check exclusion: missing or non-positive credit hours
    if (s.creditHours === null || s.creditHours === undefined || s.creditHours <= 0) {
      excludedSubjects.push({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        reason: 'NO_CREDIT_HOURS',
      });
      continue;
    }

    // Check scheme type and scale entries
    if (!s.scaleEntries || s.scaleEntries.length === 0) {
      excludedSubjects.push({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        reason: 'NO_GRADE_POINTS',
      });
      continue;
    }

    // Map subjectAverage to band and grade points
    const bandEntry = mapPercentageToBand(s.subjectAverage, s.scaleEntries);
    if (!bandEntry || bandEntry.gradePoints === null || bandEntry.gradePoints === undefined) {
      excludedSubjects.push({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        reason: 'NO_GRADE_POINTS',
      });
      continue;
    }

    const gradePoints = Number(bandEntry.gradePoints);
    const credits = Number(s.creditHours);

    // Accumulate points * 100 * credits as integer
    const pointsTimes100 = Math.round(gradePoints * 100);
    accumulatedWeightedPointsTimes100 += pointsTimes100 * credits;
    totalCredits += credits;

    subjectSummaries.push({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      creditHours: credits,
      gradePoints,
      computedPercentage: s.subjectAverage,
      computedBand: bandEntry.label,
    });
  }

  if (totalCredits === 0 || subjectSummaries.length === 0) {
    return {
      gpa: null,
      totalCredits: 0,
      subjectSummaries: [],
      excludedSubjects,
      reason: 'No eligible subjects with completed assessments and credit hours found for GPA calculation',
    };
  }

  // Exact division
  const rawGpa = accumulatedWeightedPointsTimes100 / 100 / totalCredits;
  const roundedGpa = Number(rawGpa.toFixed(2));

  return {
    gpa: roundedGpa,
    totalCredits: Number(totalCredits.toFixed(1)),
    subjectSummaries,
    excludedSubjects,
  };
}