import { prisma } from '../lib/prisma';
import {
  calculateSubjectAverage,
  validateGradeScaleEntries,
  mapPercentageToBand,
  calculateGPA,
  type AssessmentScoreInput,
  type GradeScaleEntryInput,
  type SubjectGpaInput,
} from '@unitrack/academic-core';
import type {
  CreateGradingSchemeInput,
  UpdateGradingSchemeInput,
  GradingScheme,
  SubjectGradeResponse,
  PeriodGpaResponse,
} from '@unitrack/contracts';

export class GradingServiceError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'GradingServiceError';
  }
}

export class GradingService {
  /**
   * List all grading schemes for a user
   */
  async listGradingSchemes(userId: string): Promise<GradingScheme[]> {
    const schemes = await prisma.gradingScheme.findMany({
      where: { userId },
      include: {
        scaleEntries: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return schemes.map((s: any) => ({
      id: s.id,
      name: s.name,
      schemeType: s.schemeType as any,
      version: s.version,
      isDefault: s.isDefault,
      entries: s.scaleEntries.map((e: any) => ({
        id: e.id,
        schemeId: e.schemeId,
        label: e.label,
        minPercentage: Number(e.minPercentage),
        maxPercentage: Number(e.maxPercentage),
        gradePoints: e.gradePoints ? Number(e.gradePoints) : null,
        sortOrder: e.sortOrder,
      })),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  /**
   * Get single grading scheme by ID
   */
  async getGradingScheme(userId: string, schemeId: string): Promise<GradingScheme> {
    const scheme = await prisma.gradingScheme.findFirst({
      where: { id: schemeId, userId },
      include: {
        scaleEntries: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!scheme) {
      throw new GradingServiceError(404, 'SCHEME_NOT_FOUND', 'Grading scheme not found');
    }

    return {
      id: scheme.id,
      name: scheme.name,
      schemeType: scheme.schemeType as any,
      version: scheme.version,
      isDefault: scheme.isDefault,
      entries: scheme.scaleEntries.map((e: any) => ({
        id: e.id,
        schemeId: e.schemeId,
        label: e.label,
        minPercentage: Number(e.minPercentage),
        maxPercentage: Number(e.maxPercentage),
        gradePoints: e.gradePoints ? Number(e.gradePoints) : null,
        sortOrder: e.sortOrder,
      })),
      createdAt: scheme.createdAt.toISOString(),
      updatedAt: scheme.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new grading scheme with scale entries
   */
  async createGradingScheme(userId: string, input: CreateGradingSchemeInput): Promise<GradingScheme> {
    // If schemeType requires grade bands, validate entries
    if (input.schemeType === 'SCHOOL_BAND' || input.schemeType === 'UNIVERSITY_GPA') {
      if (!input.entries || input.entries.length === 0) {
        throw new GradingServiceError(
          400,
          'VALIDATION_ERROR',
          `Grading scheme type ${input.schemeType} requires grade scale entries covering [0, 100]`
        );
      }
      const validation = validateGradeScaleEntries(input.entries);
      if (!validation.valid) {
        throw new GradingServiceError(400, 'VALIDATION_ERROR', validation.error || 'Invalid grade scale boundaries');
      }
    }

    return await prisma.$transaction(async (tx: any) => {
      // If setting as default, clear other default schemes for user
      if (input.isDefault) {
        await tx.gradingScheme.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const scheme = await tx.gradingScheme.create({
        data: {
          userId,
          name: input.name,
          schemeType: input.schemeType as any,
          version: 1,
          isDefault: input.isDefault ?? false,
          scaleEntries: input.entries
            ? {
                create: input.entries.map((entry, index) => ({
                  label: entry.label,
                  minPercentage: entry.minPercentage,
                  maxPercentage: entry.maxPercentage,
                  gradePoints: entry.gradePoints ?? null,
                  sortOrder: entry.sortOrder ?? index + 1,
                })),
              }
            : undefined,
        },
        include: {
          scaleEntries: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      return {
        id: scheme.id,
        name: scheme.name,
        schemeType: scheme.schemeType as any,
        version: scheme.version,
        isDefault: scheme.isDefault,
        entries: scheme.scaleEntries.map((e: any) => ({
          id: e.id,
          schemeId: e.schemeId,
          label: e.label,
          minPercentage: Number(e.minPercentage),
          maxPercentage: Number(e.maxPercentage),
          gradePoints: e.gradePoints ? Number(e.gradePoints) : null,
          sortOrder: e.sortOrder,
        })),
        createdAt: scheme.createdAt.toISOString(),
        updatedAt: scheme.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Update a grading scheme. Increments version if entries change (D-03 / A-03).
   */
  async updateGradingScheme(
    userId: string,
    schemeId: string,
    input: UpdateGradingSchemeInput
  ): Promise<GradingScheme> {
    const existing = await prisma.gradingScheme.findFirst({
      where: { id: schemeId, userId },
      include: { scaleEntries: true },
    });

    if (!existing) {
      throw new GradingServiceError(404, 'SCHEME_NOT_FOUND', 'Grading scheme not found');
    }

    return await prisma.$transaction(async (tx: any) => {
      let nextVersion = existing.version;

      if (input.entries) {
        const validation = validateGradeScaleEntries(input.entries);
        if (!validation.valid) {
          throw new GradingServiceError(400, 'VALIDATION_ERROR', validation.error || 'Invalid grade scale boundaries');
        }

        // Increment version when entries change
        nextVersion = existing.version + 1;

        // Replace existing scale entries
        await tx.gradeScaleEntry.deleteMany({
          where: { schemeId },
        });

        await tx.gradeScaleEntry.createMany({
          data: input.entries.map((e, index) => ({
            schemeId,
            label: e.label,
            minPercentage: e.minPercentage,
            maxPercentage: e.maxPercentage,
            gradePoints: e.gradePoints ?? null,
            sortOrder: e.sortOrder ?? index + 1,
          })),
        });
      }

      if (input.isDefault) {
        await tx.gradingScheme.updateMany({
          where: { userId, isDefault: true, id: { not: schemeId } },
          data: { isDefault: false },
        });
      }

      const updated = await tx.gradingScheme.update({
        where: { id: schemeId },
        data: {
          name: input.name,
          schemeType: input.schemeType as any,
          version: nextVersion,
          isDefault: input.isDefault,
        },
        include: {
          scaleEntries: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        schemeType: updated.schemeType as any,
        version: updated.version,
        isDefault: updated.isDefault,
        entries: updated.scaleEntries.map((e: any) => ({
          id: e.id,
          schemeId: e.schemeId,
          label: e.label,
          minPercentage: Number(e.minPercentage),
          maxPercentage: Number(e.maxPercentage),
          gradePoints: e.gradePoints ? Number(e.gradePoints) : null,
          sortOrder: e.sortOrder,
        })),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Delete a grading scheme
   */
  async deleteGradingScheme(userId: string, schemeId: string): Promise<void> {
    const existing = await prisma.gradingScheme.findFirst({
      where: { id: schemeId, userId },
    });

    if (!existing) {
      throw new GradingServiceError(404, 'SCHEME_NOT_FOUND', 'Grading scheme not found');
    }

    await prisma.gradingScheme.delete({
      where: { id: schemeId },
    });
  }

  /**
   * Compute subject grade and append an immutable CourseGrade snapshot (D-03 / A-03)
   */
  async computeSubjectGrade(userId: string, subjectId: string): Promise<SubjectGradeResponse> {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
      include: {
        gradingScheme: {
          include: {
            scaleEntries: { orderBy: { sortOrder: 'asc' } },
          },
        },
        assessments: true,
      },
    });

    if (!subject) {
      throw new GradingServiceError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
    }

    // Convert assessments to calculator input
    const assessmentInputs: AssessmentScoreInput[] = subject.assessments.map((a: any) => ({
      rawScore: a.rawScore ? Number(a.rawScore) : null,
      maxScore: a.maxScore ? Number(a.maxScore) : null,
      weight: Number(a.weight),
      status: a.status as any,
    }));

    // Calculate subject average
    const avgResult = calculateSubjectAverage(assessmentInputs);

    // Map to band if scale entries available
    let computedBand: string | null = null;
    let computedGradePoints: number | null = null;

    if (avgResult.percentage !== null && subject.gradingScheme?.scaleEntries.length) {
      const scaleInputs: GradeScaleEntryInput[] = subject.gradingScheme.scaleEntries.map((e: any) => ({
        label: e.label,
        minPercentage: Number(e.minPercentage),
        maxPercentage: Number(e.maxPercentage),
        gradePoints: e.gradePoints ? Number(e.gradePoints) : null,
      }));

      const bandEntry = mapPercentageToBand(avgResult.percentage, scaleInputs);
      if (bandEntry) {
        computedBand = bandEntry.label;
        computedGradePoints = bandEntry.gradePoints ?? null;
      }
    }

    // Append immutable CourseGrade snapshot row
    const now = new Date();
    await prisma.courseGrade.create({
      data: {
        userId,
        subjectId,
        schemeId: subject.gradingSchemeId,
        schemeVersion: subject.gradingScheme?.version ?? 1,
        computedPercentage: avgResult.percentage,
        computedBand,
        computedGradePoints,
        assessmentsIncluded: avgResult.assessmentsIncluded,
        assessmentsExcluded: avgResult.assessmentsExcluded,
        totalWeight: avgResult.totalWeight,
        calculatedAt: now,
      },
    });

    // Deterministic retrieval of latest snapshot: ORDER BY calculatedAt DESC, createdAt DESC, id DESC LIMIT 1
    const latest = await prisma.courseGrade.findFirst({
      where: { userId, subjectId },
      orderBy: [
        { calculatedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    });

    return {
      subjectId,
      computedPercentage: latest?.computedPercentage ? Number(latest.computedPercentage) : null,
      computedBand: latest?.computedBand || null,
      computedGradePoints: latest?.computedGradePoints ? Number(latest.computedGradePoints) : null,
      assessmentsIncluded: latest?.assessmentsIncluded ?? 0,
      assessmentsExcluded: latest?.assessmentsExcluded ?? 0,
      totalWeight: latest?.totalWeight ? Number(latest.totalWeight) : null,
      schemeId: latest?.schemeId || null,
      schemeVersion: latest?.schemeVersion ?? 1,
      calculatedAt: latest?.calculatedAt.toISOString() || now.toISOString(),
    };
  }

  /**
   * Compute credit-weighted GPA for all university courses in an academic period
   */
  async computePeriodGpa(userId: string, periodId: string): Promise<PeriodGpaResponse> {
    const period = await prisma.academicPeriod.findFirst({
      where: { id: periodId, userId },
      include: {
        subjects: {
          where: { isArchived: false },
          include: {
            gradingScheme: {
              include: {
                scaleEntries: { orderBy: { sortOrder: 'asc' } },
              },
            },
            assessments: true,
          },
        },
      },
    });

    if (!period) {
      throw new GradingServiceError(404, 'PERIOD_NOT_FOUND', 'Academic period not found');
    }

    // Build SubjectGpaInput array for each subject
    const subjectInputs: SubjectGpaInput[] = period.subjects.map((sub: any) => {
      const assessmentInputs: AssessmentScoreInput[] = sub.assessments.map((a: any) => ({
        rawScore: a.rawScore ? Number(a.rawScore) : null,
        maxScore: a.maxScore ? Number(a.maxScore) : null,
        weight: Number(a.weight),
        status: a.status as any,
      }));

      const avg = calculateSubjectAverage(assessmentInputs);

      const scaleEntries: GradeScaleEntryInput[] = sub.gradingScheme
        ? sub.gradingScheme.scaleEntries.map((e: any) => ({
            label: e.label,
            minPercentage: Number(e.minPercentage),
            maxPercentage: Number(e.maxPercentage),
            gradePoints: e.gradePoints ? Number(e.gradePoints) : null,
          }))
        : [];

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        creditHours: sub.creditHours ? Number(sub.creditHours) : null,
        subjectAverage: avg.percentage,
        schemeType: (sub.gradingScheme?.schemeType as any) || 'UNIVERSITY_GPA',
        scaleEntries,
      };
    });

    const gpaResult = calculateGPA(subjectInputs);

    if (gpaResult.gpa === null) {
      throw new GradingServiceError(
        422,
        'NO_GPA_ELIGIBLE_SUBJECTS',
        gpaResult.reason || 'No eligible subjects with completed assessments and credit hours found for GPA calculation'
      );
    }

    return {
      periodId,
      gpa: gpaResult.gpa,
      totalCredits: gpaResult.totalCredits,
      subjectSummaries: gpaResult.subjectSummaries,
      excludedSubjects: gpaResult.excludedSubjects,
    };
  }
}

export const gradingService = new GradingService();