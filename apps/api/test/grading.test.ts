import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Grading & GPA API Integration Tests (Phase 5)', () => {
  let userAToken: string;
  let userBToken: string;
  let userAPeriodId: string;
  let mathSubjectId: string;
  let historySubjectId: string;
  let schemeId: string;

  beforeAll(async () => {
    // 1. Clean test tables
    await prisma.courseGrade.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.gradeScaleEntry.deleteMany();
    await prisma.gradingScheme.deleteMany();
    await prisma.academicPeriod.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: { in: ['grading_user_a@unitrack.test', 'grading_user_b@unitrack.test'] },
      },
    });

    // 2. Register & verify User A
    await request(app).post('/api/v1/auth/register').send({
      email: 'grading_user_a@unitrack.test',
      password: 'Password123!',
      displayName: 'Grading User A',
      languageCode: 'en',
    });
    const userA = await prisma.user.findUnique({
      where: { email: 'grading_user_a@unitrack.test' },
    });
    await prisma.user.update({
      where: { id: userA!.id },
      data: { emailVerified: true },
    });
    const loginA = await request(app).post('/api/v1/auth/login').send({
      email: 'grading_user_a@unitrack.test',
      password: 'Password123!',
    });
    userAToken = loginA.body.accessToken;

    // 3. Register & verify User B
    await request(app).post('/api/v1/auth/register').send({
      email: 'grading_user_b@unitrack.test',
      password: 'Password123!',
      displayName: 'Grading User B',
      languageCode: 'uz',
    });
    const userB = await prisma.user.findUnique({
      where: { email: 'grading_user_b@unitrack.test' },
    });
    await prisma.user.update({
      where: { id: userB!.id },
      data: { emailVerified: true },
    });
    const loginB = await request(app).post('/api/v1/auth/login').send({
      email: 'grading_user_b@unitrack.test',
      password: 'Password123!',
    });
    userBToken = loginB.body.accessToken;

    // 4. Create an Academic Period for User A
    const periodRes = await request(app)
      .post('/api/v1/periods')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Spring 2026',
        type: 'SEMESTER',
        startDate: '2026-02-01',
        endDate: '2026-06-30',
      });
    userAPeriodId = periodRes.body.id;
  });

  // ===========================================================================
  // 1. Grading Schemes CRUD & Validation (§3.4, §5)
  // ===========================================================================
  describe('Grading Schemes CRUD', () => {
    it('rejects scheme creation if entries have gaps or do not cover [0, 100]', async () => {
      const res = await request(app)
        .post('/api/v1/grading-schemes')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Incomplete Scheme',
          schemeType: 'UNIVERSITY_GPA',
          entries: [
            { label: 'Pass', minPercentage: 60, maxPercentage: 100, gradePoints: 4.0 },
          ], // Gap: 0..59 missing
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('lowest boundary must start at 0%');
    });

    it('rejects scheme creation if entries overlap', async () => {
      const res = await request(app)
        .post('/api/v1/grading-schemes')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Overlapping Scheme',
          schemeType: 'UNIVERSITY_GPA',
          entries: [
            { label: 'F', minPercentage: 0, maxPercentage: 60, gradePoints: 0.0 },
            { label: 'D', minPercentage: 55, maxPercentage: 100, gradePoints: 1.0 }, // Overlaps 55-60
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('overlap detected');
    });

    it('successfully creates valid US Letter Grade scheme with full entries', async () => {
      const res = await request(app)
        .post('/api/v1/grading-schemes')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'US Letter Grade',
          schemeType: 'UNIVERSITY_GPA',
          isDefault: true,
          entries: [
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
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('US Letter Grade');
      expect(res.body.version).toBe(1);
      expect(res.body.entries).toHaveLength(11);
      schemeId = res.body.id;
    });

    it('increments version from 1 to 2 when entries change on update (D-03 / A-03)', async () => {
      const res = await request(app)
        .patch(`/api/v1/grading-schemes/${schemeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          entries: [
            { label: 'F', minPercentage: 0, maxPercentage: 59, gradePoints: 0.0 },
            { label: 'D', minPercentage: 60, maxPercentage: 66, gradePoints: 1.0 },
            { label: 'D+', minPercentage: 67, maxPercentage: 69, gradePoints: 1.3 },
            { label: 'C-', minPercentage: 70, maxPercentage: 72, gradePoints: 1.7 },
            { label: 'C', minPercentage: 73, maxPercentage: 76, gradePoints: 2.0 },
            { label: 'C+', minPercentage: 77, maxPercentage: 79, gradePoints: 2.3 },
            { label: 'B-', minPercentage: 80, maxPercentage: 82, gradePoints: 2.7 },
            { label: 'B', minPercentage: 83, maxPercentage: 86, gradePoints: 3.0 },
            { label: 'B+', minPercentage: 87, maxPercentage: 89, gradePoints: 3.3 },
            { label: 'A-', minPercentage: 90, maxPercentage: 91, gradePoints: 3.7 }, // adjusted
            { label: 'A', minPercentage: 92, maxPercentage: 100, gradePoints: 4.0 }, // adjusted
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.version).toBe(2);
    });

    it('enforces user isolation: User B cannot access or modify User A scheme', async () => {
      const getRes = await request(app)
        .get(`/api/v1/grading-schemes/${schemeId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(getRes.status).toBe(404);

      const patchRes = await request(app)
        .patch(`/api/v1/grading-schemes/${schemeId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked Scheme' });
      expect(patchRes.status).toBe(404);
    });
  });

  // ===========================================================================
  // 2. Computed Course Grade & Historical Snapshots (docs/grading-rules.md §3.2, §4)
  // ===========================================================================
  describe('GET /api/v1/subjects/:subjectId/grade', () => {
    it('creates subjects and assessments matching §3.2 example', async () => {
      // Create Math (4 credits, linked to schemeId)
      const mathRes = await request(app)
        .post(`/api/v1/periods/${userAPeriodId}/subjects`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Mathematics',
          creditHours: 4.0,
          gradingSchemeId: schemeId,
        });
      mathSubjectId = mathRes.body.id;

      // Add assessments matching §3.2:
      // Quiz 1: 18/20, weight 0.10
      await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          subjectId: mathSubjectId,
          title: 'Quiz 1',
          assessmentType: 'QUIZ',
          scheduledAt: '2026-03-01T10:00:00Z',
          weight: 0.1,
        })
        .then((r) =>
          request(app)
            .patch(`/api/v1/assessments/${r.body.id}`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ status: 'COMPLETED', rawScore: 18, maxScore: 20 })
        );

      // Midterm: 72/100, weight 0.30
      await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          subjectId: mathSubjectId,
          title: 'Midterm',
          assessmentType: 'MIDTERM',
          scheduledAt: '2026-04-01T10:00:00Z',
          weight: 0.3,
        })
        .then((r) =>
          request(app)
            .patch(`/api/v1/assessments/${r.body.id}`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ status: 'COMPLETED', rawScore: 72, maxScore: 100 })
        );

      // Lab Report: Missing (SCHEDULED), weight 0.20
      await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          subjectId: mathSubjectId,
          title: 'Lab Report',
          assessmentType: 'LAB',
          scheduledAt: '2026-04-15T10:00:00Z',
          weight: 0.2,
        });

      // Final Exam: 85/100, weight 0.40
      await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          subjectId: mathSubjectId,
          title: 'Final Exam',
          assessmentType: 'FINAL',
          scheduledAt: '2026-05-20T10:00:00Z',
          weight: 0.4,
        })
        .then((r) =>
          request(app)
            .patch(`/api/v1/assessments/${r.body.id}`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ status: 'COMPLETED', rawScore: 85, maxScore: 100 })
        );
    });

    it('computes subject grade exactly as 80.75%, band B-, and stores immutable CourseGrade snapshot', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubjectId}/grade`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.subjectId).toBe(mathSubjectId);
      expect(res.body.computedPercentage).toBe(80.75);
      expect(res.body.computedBand).toBe('B-');
      expect(res.body.computedGradePoints).toBe(2.7);
      expect(res.body.assessmentsIncluded).toBe(3);
      expect(res.body.assessmentsExcluded).toBe(1);
      expect(res.body.totalWeight).toBe(0.8);
      expect(res.body.schemeVersion).toBe(2);

      // Verify row exists in CourseGrade database table
      const storedSnapshots = await prisma.courseGrade.findMany({
        where: { subjectId: mathSubjectId },
      });
      expect(storedSnapshots.length).toBeGreaterThanOrEqual(1);
      expect(Number(storedSnapshots[0].computedPercentage)).toBe(80.75);
    });

    it('appends snapshots without overwriting history on subsequent calculations (D-03 / A-03)', async () => {
      // Re-trigger calculation
      await request(app)
        .get(`/api/v1/subjects/${mathSubjectId}/grade`)
        .set('Authorization', `Bearer ${userAToken}`);

      const allSnapshots = await prisma.courseGrade.findMany({
        where: { subjectId: mathSubjectId },
      });
      // Should have 2 snapshot rows appended
      expect(allSnapshots).toHaveLength(2);
    });
  });

  // ===========================================================================
  // 3. Period GPA Calculation (docs/grading-rules.md §3.5)
  // ===========================================================================
  describe('GET /api/v1/periods/:periodId/gpa', () => {
    it('creates additional subjects to complete §3.5 GPA formula test', async () => {
      // History (3 credits, 76.0% => C 2.0)
      const histRes = await request(app)
        .post(`/api/v1/periods/${userAPeriodId}/subjects`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'History',
          creditHours: 3.0,
          gradingSchemeId: schemeId,
        });
      historySubjectId = histRes.body.id;

      await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          subjectId: historySubjectId,
          title: 'Essay',
          assessmentType: 'ASSIGNMENT',
          scheduledAt: '2026-03-10T10:00:00Z',
          weight: 1.0,
        })
        .then((r) =>
          request(app)
            .patch(`/api/v1/assessments/${r.body.id}`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ status: 'COMPLETED', rawScore: 76, maxScore: 100 })
        );
    });

    it('computes GPA and returns breakdown with credit hours', async () => {
      const res = await request(app)
        .get(`/api/v1/periods/${userAPeriodId}/gpa`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.periodId).toBe(userAPeriodId);
      // Math: 4 cr * 2.7 = 10.8
      // History: 3 cr * 2.0 = 6.0
      // Total points: 16.8 / 7 = 2.40
      expect(res.body.gpa).toBe(2.4);
      expect(res.body.totalCredits).toBe(7);
      expect(res.body.subjectSummaries).toHaveLength(2);
    });

    it('returns 422 if no subjects are eligible for GPA calculation', async () => {
      // Create empty period for User B with no completed assessments
      const emptyPeriod = await request(app)
        .post('/api/v1/periods')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          name: 'Empty Period',
          type: 'SEMESTER',
          startDate: '2026-09-01',
          endDate: '2027-01-31',
        });

      const res = await request(app)
        .get(`/api/v1/periods/${emptyPeriod.body.id}/gpa`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('NO_GPA_ELIGIBLE_SUBJECTS');
    });

    it('enforces user isolation: User B cannot fetch GPA for User A period', async () => {
      const res = await request(app)
        .get(`/api/v1/periods/${userAPeriodId}/gpa`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });
});