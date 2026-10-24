-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('ATTENDED', 'MISSED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "HabitFrequencyType" AS ENUM ('DAILY', 'SELECTED_WEEKDAYS', 'WEEKLY_TARGET');

-- CreateEnum
CREATE TYPE "HabitLogStatus" AS ENUM ('COMPLETED', 'SKIPPED', 'MISSED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "contextId" UUID,
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "postponedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Context" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "colorHex" CHAR(7) NOT NULL,
    "icon" VARCHAR(30),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleCommitment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "contextId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "location" VARCHAR(150),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "specificDate" DATE,
    "weekday" SMALLINT,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "isOvernight" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitmentLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "commitmentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "CommitmentStatus" NOT NULL,
    "rescheduledStartTime" TIME,
    "rescheduledEndTime" TIME,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "contextId" UUID,
    "title" VARCHAR(150) NOT NULL,
    "frequencyType" "HabitFrequencyType" NOT NULL DEFAULT 'DAILY',
    "selectedWeekdays" INTEGER[],
    "targetPerWeek" SMALLINT,
    "targetUnits" INTEGER NOT NULL DEFAULT 1,
    "unitLabel" VARCHAR(30),
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "habitId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "HabitLogStatus" NOT NULL DEFAULT 'COMPLETED',
    "completedUnits" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Context_userId_isArchived_sortOrder_idx" ON "Context"("userId", "isArchived", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Context_userId_name_key" ON "Context"("userId", "name");

-- CreateIndex
CREATE INDEX "ScheduleCommitment_userId_isArchived_idx" ON "ScheduleCommitment"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "ScheduleCommitment_userId_isRecurring_weekday_idx" ON "ScheduleCommitment"("userId", "isRecurring", "weekday");

-- CreateIndex
CREATE INDEX "ScheduleCommitment_userId_specificDate_idx" ON "ScheduleCommitment"("userId", "specificDate");

-- CreateIndex
CREATE INDEX "CommitmentLog_userId_date_idx" ON "CommitmentLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CommitmentLog_commitmentId_date_key" ON "CommitmentLog"("commitmentId", "date");

-- CreateIndex
CREATE INDEX "Habit_userId_isArchived_idx" ON "Habit"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "HabitLog_userId_date_idx" ON "HabitLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");

-- CreateIndex
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");

-- CreateIndex
CREATE INDEX "Task_userId_contextId_idx" ON "Task"("userId", "contextId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Context" ADD CONSTRAINT "Context_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleCommitment" ADD CONSTRAINT "ScheduleCommitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleCommitment" ADD CONSTRAINT "ScheduleCommitment_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitmentLog" ADD CONSTRAINT "CommitmentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitmentLog" ADD CONSTRAINT "CommitmentLog_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "ScheduleCommitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
