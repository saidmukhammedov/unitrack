-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('SCHOOL', 'UNIVERSITY', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL_PASSWORD', 'GOOGLE');

-- CreateEnum
CREATE TYPE "AcademicPeriodType" AS ENUM ('SCHOOL_YEAR', 'SEMESTER', 'TRIMESTER', 'QUARTER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('HOMEWORK', 'READING', 'PROJECT', 'LAB', 'PRESENTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('EXAM', 'QUIZ', 'MIDTERM', 'FINAL', 'LAB', 'PRESENTATION', 'ASSIGNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'EXCUSED');

-- CreateEnum
CREATE TYPE "GradingSchemeType" AS ENUM ('PERCENTAGE', 'WEIGHTED_AVERAGE', 'SCHOOL_BAND', 'UNIVERSITY_GPA');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('TASK_REMINDER', 'ASSESSMENT_REMINDER');

-- CreateEnum
CREATE TYPE "NotificationReferenceType" AS ENUM ('TASK', 'ASSESSMENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" VARCHAR(100) NOT NULL,
    "avatarUrl" TEXT,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "languageCode" VARCHAR(10) NOT NULL DEFAULT 'en',
    "institutionType" "InstitutionType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicPeriod" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "AcademicPeriodType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "gradingSchemeId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "colorHex" CHAR(7),
    "teacherName" VARCHAR(100),
    "creditHours" DECIMAL(4,1),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "location" VARCHAR(150),
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "subjectId" UUID,
    "periodId" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "taskType" "TaskType" NOT NULL DEFAULT 'OTHER',
    "dueAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL,
    "scheduledAt" TIMESTAMPTZ NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "rawScore" DECIMAL(8,2),
    "maxScore" DECIMAL(8,2),
    "weight" DECIMAL(6,4) NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingScheme" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "schemeType" "GradingSchemeType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradingScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeScaleEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schemeId" UUID NOT NULL,
    "label" VARCHAR(20) NOT NULL,
    "minPercentage" DECIMAL(5,2) NOT NULL,
    "maxPercentage" DECIMAL(5,2) NOT NULL,
    "gradePoints" DECIMAL(4,2),
    "sortOrder" SMALLINT NOT NULL,

    CONSTRAINT "GradeScaleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGrade" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "schemeId" UUID,
    "schemeVersion" INTEGER NOT NULL,
    "computedPercentage" DECIMAL(5,2),
    "computedBand" VARCHAR(20),
    "computedGradePoints" DECIMAL(4,2),
    "assessmentsIncluded" INTEGER NOT NULL DEFAULT 0,
    "assessmentsExcluded" INTEGER NOT NULL DEFAULT 0,
    "totalWeight" DECIMAL(6,4),
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideNotes" TEXT,
    "calculatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "deviceLabel" VARCHAR(100),
    "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "leadTimeMinutes" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "deviceId" UUID,
    "referenceType" "NotificationReferenceType" NOT NULL,
    "referenceId" UUID NOT NULL,
    "scheduledFor" TIMESTAMPTZ NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerAccountId_key" ON "AuthIdentity"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_expiresAt_idx" ON "RefreshSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AcademicPeriod_userId_isArchived_idx" ON "AcademicPeriod"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "AcademicPeriod_userId_startDate_idx" ON "AcademicPeriod"("userId", "startDate");

-- CreateIndex
CREATE INDEX "Subject_userId_periodId_idx" ON "Subject"("userId", "periodId");

-- CreateIndex
CREATE INDEX "Subject_userId_isArchived_idx" ON "Subject"("userId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_id_periodId_key" ON "Subject"("id", "periodId");

-- CreateIndex
CREATE INDEX "ClassSession_userId_subjectId_idx" ON "ClassSession"("userId", "subjectId");

-- CreateIndex
CREATE INDEX "ClassSession_userId_periodId_weekday_idx" ON "ClassSession"("userId", "periodId", "weekday");

-- CreateIndex
CREATE INDEX "Task_userId_dueAt_idx" ON "Task"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "Task_userId_subjectId_idx" ON "Task"("userId", "subjectId");

-- CreateIndex
CREATE INDEX "Task_userId_completedAt_idx" ON "Task"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "Assessment_userId_subjectId_idx" ON "Assessment"("userId", "subjectId");

-- CreateIndex
CREATE INDEX "Assessment_userId_periodId_idx" ON "Assessment"("userId", "periodId");

-- CreateIndex
CREATE INDEX "Assessment_userId_scheduledAt_idx" ON "Assessment"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Assessment_userId_status_idx" ON "Assessment"("userId", "status");

-- CreateIndex
CREATE INDEX "GradingScheme_userId_idx" ON "GradingScheme"("userId");

-- CreateIndex
CREATE INDEX "GradingScheme_userId_isDefault_idx" ON "GradingScheme"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "GradeScaleEntry_schemeId_sortOrder_idx" ON "GradeScaleEntry"("schemeId", "sortOrder");

-- CreateIndex
CREATE INDEX "CourseGrade_userId_subjectId_calculatedAt_createdAt_idx" ON "CourseGrade"("userId", "subjectId", "calculatedAt" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CourseGrade_userId_subjectId_idx" ON "CourseGrade"("userId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_expoPushToken_key" ON "Device"("expoPushToken");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId", "category");

-- CreateIndex
CREATE INDEX "NotificationDelivery_userId_status_idx" ON "NotificationDelivery"("userId", "status");

-- CreateIndex
CREATE INDEX "NotificationDelivery_referenceType_referenceId_idx" ON "NotificationDelivery"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_scheduledFor_status_idx" ON "NotificationDelivery"("scheduledFor", "status");

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_gradingSchemeId_fkey" FOREIGN KEY ("gradingSchemeId") REFERENCES "GradingScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_subjectId_periodId_fkey" FOREIGN KEY ("subjectId", "periodId") REFERENCES "Subject"("id", "periodId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_subjectId_periodId_fkey" FOREIGN KEY ("subjectId", "periodId") REFERENCES "Subject"("id", "periodId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingScheme" ADD CONSTRAINT "GradingScheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeScaleEntry" ADD CONSTRAINT "GradeScaleEntry_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "GradingScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGrade" ADD CONSTRAINT "CourseGrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGrade" ADD CONSTRAINT "CourseGrade_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGrade" ADD CONSTRAINT "CourseGrade_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "GradingScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom Check Constraints (Docs & Review items D-01, D-02, A-01, A-02)

-- Assessment score integrity: maxScore > 0, rawScore >= 0, COMPLETED requires both scores
ALTER TABLE "Assessment" ADD CONSTRAINT "assessment_score_check" CHECK (
  ("maxScore" IS NULL OR "maxScore" > 0) AND
  ("rawScore" IS NULL OR "rawScore" >= 0) AND
  ("status" != 'COMPLETED' OR ("rawScore" IS NOT NULL AND "maxScore" IS NOT NULL))
);

ALTER TABLE "Assessment" ADD CONSTRAINT "assessment_weight_check" CHECK ("weight" >= 0);

-- ClassSession time and weekday checks
ALTER TABLE "ClassSession" ADD CONSTRAINT "class_session_time_check" CHECK ("endTime" > "startTime");
ALTER TABLE "ClassSession" ADD CONSTRAINT "class_session_weekday_check" CHECK ("weekday" >= 0 AND "weekday" <= 6);

-- AcademicPeriod date range check
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "academic_period_date_check" CHECK ("endDate" >= "startDate");

-- GradeScaleEntry percentage boundary checks
ALTER TABLE "GradeScaleEntry" ADD CONSTRAINT "grade_scale_entry_percentage_check" CHECK (
  "minPercentage" >= 0 AND "maxPercentage" <= 100 AND "minPercentage" <= "maxPercentage"
);

-- NotificationPreference lead time check
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "notification_preference_lead_time_check" CHECK ("leadTimeMinutes" > 0);

