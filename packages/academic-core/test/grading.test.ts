import { describe, it, expect } from 'vitest';
import {
  calculatePercentageGrade,
  calculateSubjectAverage,
  validateGradeScaleEntries,
  mapPercentageToBand,
  calculateGPA,
  type GradeScaleEntryInput,
  type AssessmentScoreInput,
  type SubjectGpaInput,
} from '../src/index';

describe('Grading Specification Tests (docs/grading-rules.md)', () => {
  // ===========================================================================
  // 1. Percentage Grade (§3.1)
  // ===========================================================================
  describe('calculatePercentageGrade (§3.1)', () => {
    it('computes exact formula example: 47 / 60 => 78.33%', () => {
      const result = calculatePercentageGrade(47, 60);
      expect(result).toBe(78.33);
    });

    it('handles perfect score: 100 / 100 => 100.00%', () => {
      expect(calculatePercentageGrade(100, 100)).toBe(100);
    });

    it('handles zero raw score: 0 / 100 => 0.00%', () => {
      expect(calculatePercentageGrade(0, 100)).toBe(0);
    });

    it('handles extra credit / bonus points: 105 / 100 => 105.00%', () => {
      const result = calculatePercentageGrade(105, 100);
      expect(result).toBe(105);
    });

    it('rejects maxScore <= 0 [A-01]', () => {
      expect(() => calculatePercentageGrade(50, 0)).toThrow('maxScore must be strictly greater than 0');
      expect(() => calculatePercentageGrade(50, -10)).toThrow('maxScore must be strictly greater than 0');
    });

    it('rejects rawScore < 0 [A-01]', () => {
      expect(() => calculatePercentageGrade(-5, 100)).toThrow('rawScore must be non-negative');
    });
  });

  // ===========================================================================
  // 2. Subject Weighted Average (§3.2, §3.3, §3.6)
  // ===========================================================================
  describe('calculateSubjectAverage (§3.2, §3.3, §3.6)', () => {
    it('computes exact specification example (§3.2): Quiz1 (90%), Midterm (72%), Lab (missing), Final (85%) => 80.75%', () => {
      const assessments: AssessmentScoreInput[] = [
        { rawScore: 18, maxScore: 20, weight: 0.1, status: 'COMPLETED' }, // 90%
        { rawScore: 72, maxScore: 100, weight: 0.3, status: 'COMPLETED' }, // 72%
        { rawScore: null, maxScore: 50, weight: 0.2, status: 'SCHEDULED' }, // Missing Lab
        { rawScore: 85, maxScore: 100, weight: 0.4, status: 'COMPLETED' }, // 85%
      ];

      const result = calculateSubjectAverage(assessments);

      expect(result.assessmentsIncluded).toBe(3);
      expect(result.assessmentsExcluded).toBe(1);
      expect(result.totalWeight).toBe(0.8);
      // (90 * 0.1 + 72 * 0.3 + 85 * 0.4) / 0.8 = (9 + 21.6 + 34) / 0.8 = 64.6 / 0.8 = 80.75
      expect(result.percentage).toBe(80.75);
      expect(result.isWeightSumNormal).toBe(true);
    });

    it('correctly treats EXCUSED assessment by excluding it from numerator and denominator (§3.3)', () => {
      const assessments: AssessmentScoreInput[] = [
        { rawScore: 80, maxScore: 100, weight: 0.5, status: 'COMPLETED' },
        { rawScore: 0, maxScore: 100, weight: 0.2, status: 'EXCUSED' }, // Excused
        { rawScore: 100, maxScore: 100, weight: 0.3, status: 'COMPLETED' },
      ];

      const result = calculateSubjectAverage(assessments);
      // Denominator is 0.5 + 0.3 = 0.8. Numerator is 80 * 0.5 + 100 * 0.3 = 40 + 30 = 70.
      // 70 / 0.8 = 87.50%
      expect(result.percentage).toBe(87.5);
      expect(result.assessmentsIncluded).toBe(2);
      expect(result.assessmentsExcluded).toBe(1);
      expect(result.totalWeight).toBe(0.8);
    });

    it('distinguishes missing grade vs explicit zero score (§3.6)', () => {
      // 1. Missing grade (SCHEDULED): excluded, does not drag average down
      const withMissing: AssessmentScoreInput[] = [
        { rawScore: 100, maxScore: 100, weight: 0.5, status: 'COMPLETED' },
        { rawScore: null, maxScore: 100, weight: 0.5, status: 'SCHEDULED' },
      ];
      expect(calculateSubjectAverage(withMissing).percentage).toBe(100);

      // 2. Explicit zero score: included as 0.00%, cuts average in half
      const withZero: AssessmentScoreInput[] = [
        { rawScore: 100, maxScore: 100, weight: 0.5, status: 'COMPLETED' },
        { rawScore: 0, maxScore: 100, weight: 0.5, status: 'COMPLETED' },
      ];
      expect(calculateSubjectAverage(withZero).percentage).toBe(50);
    });

    it('returns null percentage when all assessments are missing/scheduled', () => {
      const assessments: AssessmentScoreInput[] = [
        { rawScore: null, maxScore: 100, weight: 0.5, status: 'SCHEDULED' },
        { rawScore: null, maxScore: 50, weight: 0.5, status: 'SCHEDULED' },
      ];
      const result = calculateSubjectAverage(assessments);
      expect(result.percentage).toBeNull();
      expect(result.assessmentsIncluded).toBe(0);
      expect(result.assessmentsExcluded).toBe(2);
    });

    it('returns null percentage when all assessments are excused', () => {
      const assessments: AssessmentScoreInput[] = [
        { rawScore: null, maxScore: 100, weight: 0.5, status: 'EXCUSED' },
        { rawScore: null, maxScore: 100, weight: 0.5, status: 'EXCUSED' },
      ];
      const result = calculateSubjectAverage(assessments);
      expect(result.percentage).toBeNull();
      expect(result.assessmentsIncluded).toBe(0);
    });

    it('handles single completed assessment correctly', () => {
      const assessments: AssessmentScoreInput[] = [
        { rawScore: 84, maxScore: 100, weight: 1.0, status: 'COMPLETED' },
      ];
      const result = calculateSubjectAverage(assessments);
      expect(result.percentage).toBe(84);
      expect(result.assessmentsIncluded).toBe(1);
    });

    it('attaches warning when completed assessment has extra credit', () => {
      const assessments: AssessmentScoreInput[] = [
        { rawScore: 110, maxScore: 100, weight: 1.0, status: 'COMPLETED' },
      ];
      const result = calculateSubjectAverage(assessments);
      expect(result.percentage).toBe(110);
      expect(result.warning).toBe('RAW_SCORE_EXCEEDS_MAX');
    });

    it('detects when sum of assessment weights is not 1.0 (warns)', () => {
      const assessments: AssessmentScoreInput[] = [
        { rawScore: 90, maxScore: 100, weight: 0.3, status: 'COMPLETED' },
        { rawScore: 80, maxScore: 100, weight: 0.3, status: 'COMPLETED' },
      ];
      const result = calculateSubjectAverage(assessments);
      // Sum is 0.60 != 1.0
      expect(result.isWeightSumNormal).toBe(false);
    });
  });

  // ===========================================================================
  // 3. Grade Scale Validation & Mapping (§3.4, §5)
  // ===========================================================================
  describe('Grade Scale Validation & Mapping (§3.4, §5)', () => {
    const usLetterScale: GradeScaleEntryInput[] = [
      { label: 'F', minPercentage: 0, maxPercentage: 59, gradePoints: 0.0, sortOrder: 11 },
      { label: 'D', minPercentage: 60, maxPercentage: 66, gradePoints: 1.0, sortOrder: 10 },
      { label: 'D+', minPercentage: 67, maxPercentage: 69, gradePoints: 1.3, sortOrder: 9 },
      { label: 'C-', minPercentage: 70, maxPercentage: 72, gradePoints: 1.7, sortOrder: 8 },
      { label: 'C', minPercentage: 73, maxPercentage: 76, gradePoints: 2.0, sortOrder: 7 },
      { label: 'C+', minPercentage: 77, maxPercentage: 79, gradePoints: 2.3, sortOrder: 6 },
      { label: 'B-', minPercentage: 80, maxPercentage: 82, gradePoints: 2.7, sortOrder: 5 },
      { label: 'B', minPercentage: 83, maxPercentage: 86, gradePoints: 3.0, sortOrder: 4 },
      { label: 'B+', minPercentage: 87, maxPercentage: 89, gradePoints: 3.3, sortOrder: 3 },
      { label: 'A-', minPercentage: 90, maxPercentage: 92, gradePoints: 3.7, sortOrder: 2 },
      { label: 'A', minPercentage: 93, maxPercentage: 100, gradePoints: 4.0, sortOrder: 1 },
    ];

    it('validates a complete US Letter Grade scale', () => {
      const validation = validateGradeScaleEntries(usLetterScale);
      expect(validation.valid).toBe(true);
    });

    it('validates Uzbekistan 5-point school scale (§3.4)', () => {
      const uzScale: GradeScaleEntryInput[] = [
        { label: '2', minPercentage: 0, maxPercentage: 49, gradePoints: null },
        { label: '3', minPercentage: 50, maxPercentage: 69, gradePoints: null },
        { label: '4', minPercentage: 70, maxPercentage: 89, gradePoints: null },
        { label: '5', minPercentage: 90, maxPercentage: 100, gradePoints: null },
      ];
      const validation = validateGradeScaleEntries(uzScale);
      expect(validation.valid).toBe(true);
    });

    it('rejects scale that does not start at 0%', () => {
      const brokenScale: GradeScaleEntryInput[] = [
        { label: 'Pass', minPercentage: 50, maxPercentage: 100 },
      ];
      const validation = validateGradeScaleEntries(brokenScale);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('lowest boundary must start at 0%');
    });

    it('rejects scale that does not reach 100%', () => {
      const brokenScale: GradeScaleEntryInput[] = [
        { label: 'Low', minPercentage: 0, maxPercentage: 90 },
      ];
      const validation = validateGradeScaleEntries(brokenScale);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('highest boundary must reach 100%');
    });

    it('rejects overlapping bands', () => {
      const overlapScale: GradeScaleEntryInput[] = [
        { label: 'F', minPercentage: 0, maxPercentage: 65 },
        { label: 'D', minPercentage: 60, maxPercentage: 100 },
      ];
      const validation = validateGradeScaleEntries(overlapScale);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('overlap detected');
    });

    it('rejects gaps between bands', () => {
      const gapScale: GradeScaleEntryInput[] = [
        { label: 'F', minPercentage: 0, maxPercentage: 50 },
        { label: 'Pass', minPercentage: 60, maxPercentage: 100 }, // 51-59 gap
      ];
      const validation = validateGradeScaleEntries(gapScale);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('gap detected');
    });

    it('maps percentage to correct grade band and grade points', () => {
      expect(mapPercentageToBand(95, usLetterScale)?.label).toBe('A');
      expect(mapPercentageToBand(91, usLetterScale)?.label).toBe('A-');
      expect(mapPercentageToBand(88, usLetterScale)?.label).toBe('B+');
      expect(mapPercentageToBand(76, usLetterScale)?.label).toBe('C');
      expect(mapPercentageToBand(61, usLetterScale)?.label).toBe('D');
      expect(mapPercentageToBand(45, usLetterScale)?.label).toBe('F');
    });

    it('maps extra credit (> 100%) to top band A', () => {
      expect(mapPercentageToBand(105, usLetterScale)?.label).toBe('A');
    });
  });

  // ===========================================================================
  // 4. Credit-Weighted GPA (§3.5)
  // ===========================================================================
  describe('calculateGPA (§3.5)', () => {
    const scale: GradeScaleEntryInput[] = [
      { label: 'F', minPercentage: 0, maxPercentage: 59, gradePoints: 0.0 },
      { label: 'D', minPercentage: 60, maxPercentage: 66, gradePoints: 1.0 },
      { label: 'D+', minPercentage: 67, maxPercentage: 69, gradePoints: 1.3 },
      { label: 'C-', minPercentage: 70, maxPercentage: 72, gradePoints: 1.7 },
      { label: 'C', minPercentage: 73, maxPercentage: 76, gradePoints: 2.0 },
      { label: 'C+', minPercentage: 77, maxPercentage: 79, gradePoints: 2.3 },
      { label: 'B-', minPercentage: 80, maxPercentage: 82, gradePoints: 2.7 },
      { label: 'B', minPercentage: 83, maxPercentage: 86, gradePoints: 3.0 },
      { label: 'B+', minPercentage: 87, maxPercentage: 89, gradePoints: 3.3 },
      { label: 'A-', minPercentage: 90, maxPercentage: 92, gradePoints: 3.7 },
      { label: 'A', minPercentage: 93, maxPercentage: 100, gradePoints: 4.0 },
    ];

    it('computes exact specification example (§3.5): Math (4cr, 88.0% => B+ 3.3), History (3cr, 76.0% => C 2.0), Physics (4cr, 92.0% => A- 3.7), Literature (2cr, 61.0% => D 1.0) => GPA 2.77', () => {
      const subjects: SubjectGpaInput[] = [
        {
          subjectId: 'sub-1',
          subjectName: 'Mathematics',
          creditHours: 4,
          subjectAverage: 88.0,
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
        {
          subjectId: 'sub-2',
          subjectName: 'History',
          creditHours: 3,
          subjectAverage: 76.0,
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
        {
          subjectId: 'sub-3',
          subjectName: 'Physics',
          creditHours: 4,
          subjectAverage: 92.0,
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
        {
          subjectId: 'sub-4',
          subjectName: 'Literature',
          creditHours: 2,
          subjectAverage: 61.0,
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
      ];

      const res = calculateGPA(subjects);

      expect(res.totalCredits).toBe(13);
      expect(res.subjectSummaries).toHaveLength(4);
      // (13.2 + 6.0 + 14.8 + 2.0) / 13 = 36.0 / 13 = 2.7692... => 2.77
      expect(res.gpa).toBe(2.77);
      expect(res.excludedSubjects).toHaveLength(0);
    });

    it('excludes subjects without completed assessments (NO_COMPLETED_ASSESSMENTS)', () => {
      const subjects: SubjectGpaInput[] = [
        {
          subjectId: 'sub-1',
          subjectName: 'Math',
          creditHours: 3,
          subjectAverage: 95.0,
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
        {
          subjectId: 'sub-2',
          subjectName: 'Gym (Pending)',
          creditHours: 1,
          subjectAverage: null, // No completed assessments
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
      ];

      const res = calculateGPA(subjects);
      expect(res.gpa).toBe(4.0);
      expect(res.totalCredits).toBe(3);
      expect(res.excludedSubjects).toEqual([
        {
          subjectId: 'sub-2',
          subjectName: 'Gym (Pending)',
          reason: 'NO_COMPLETED_ASSESSMENTS',
        },
      ]);
    });

    it('excludes subjects without positive credit hours (NO_CREDIT_HOURS)', () => {
      const subjects: SubjectGpaInput[] = [
        {
          subjectId: 'sub-1',
          subjectName: 'Math',
          creditHours: 3,
          subjectAverage: 95.0,
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
        {
          subjectId: 'sub-2',
          subjectName: 'Zero Credit Club',
          creditHours: 0,
          subjectAverage: 100,
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
      ];

      const res = calculateGPA(subjects);
      expect(res.gpa).toBe(4.0);
      expect(res.totalCredits).toBe(3);
      expect(res.excludedSubjects).toEqual([
        {
          subjectId: 'sub-2',
          subjectName: 'Zero Credit Club',
          reason: 'NO_CREDIT_HOURS',
        },
      ]);
    });

    it('excludes subjects assigned a scheme without gradePoints mappings (NO_GRADE_POINTS)', () => {
      const noPointsScale: GradeScaleEntryInput[] = [
        { label: 'Pass', minPercentage: 50, maxPercentage: 100, gradePoints: null },
        { label: 'Fail', minPercentage: 0, maxPercentage: 49, gradePoints: null },
      ];

      const subjects: SubjectGpaInput[] = [
        {
          subjectId: 'sub-1',
          subjectName: 'Math',
          creditHours: 3,
          subjectAverage: 95.0,
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
        {
          subjectId: 'sub-2',
          subjectName: 'Pass/Fail Course',
          creditHours: 2,
          subjectAverage: 90,
          schemeType: 'SCHOOL_BAND',
          scaleEntries: noPointsScale,
        },
      ];

      const res = calculateGPA(subjects);
      expect(res.gpa).toBe(4.0);
      expect(res.excludedSubjects[0].reason).toBe('NO_GRADE_POINTS');
    });

    it('returns null GPA with descriptive reason when no subjects qualify', () => {
      const subjects: SubjectGpaInput[] = [
        {
          subjectId: 'sub-1',
          subjectName: 'Math',
          creditHours: 3,
          subjectAverage: null,
          schemeType: 'UNIVERSITY_GPA',
          scaleEntries: scale,
        },
      ];

      const res = calculateGPA(subjects);
      expect(res.gpa).toBeNull();
      expect(res.totalCredits).toBe(0);
      expect(res.reason).toContain('No eligible subjects');
    });
  });
});