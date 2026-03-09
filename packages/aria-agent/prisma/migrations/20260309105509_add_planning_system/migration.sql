-- CreateEnum
CREATE TYPE "public"."PlanStatus" AS ENUM ('PLANNING', 'PENDING', 'APPROVED', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."Strategy" AS ENUM ('TERMINAL', 'GUI', 'HYBRID', 'BROWSER');

-- CreateEnum
CREATE TYPE "public"."StepType" AS ENUM ('TERMINAL', 'GUI', 'BROWSER', 'WAIT', 'VERIFY');

-- CreateEnum
CREATE TYPE "public"."StepStatus" AS ENUM ('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "planningEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."Plan" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "status" "public"."PlanStatus" NOT NULL DEFAULT 'PLANNING',
    "selectedPathId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExecutionPath" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "strategy" "public"."Strategy" NOT NULL,
    "estimatedTokens" INTEGER NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "successProbability" DOUBLE PRECISION NOT NULL,
    "pros" TEXT[],
    "cons" TEXT[],
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlanStep" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."StepType" NOT NULL,
    "command" TEXT,
    "screenshot" BOOLEAN NOT NULL DEFAULT false,
    "verification" TEXT,
    "estimatedTokens" INTEGER NOT NULL,
    "checkpoint" BOOLEAN NOT NULL DEFAULT false,
    "dependencies" TEXT[],
    "status" "public"."StepStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Checkpoint" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "screenshot" TEXT,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_taskId_key" ON "public"."Plan"("taskId");

-- CreateIndex
CREATE INDEX "Plan_taskId_idx" ON "public"."Plan"("taskId");

-- CreateIndex
CREATE INDEX "Plan_status_idx" ON "public"."Plan"("status");

-- CreateIndex
CREATE INDEX "ExecutionPath_planId_idx" ON "public"."ExecutionPath"("planId");

-- CreateIndex
CREATE INDEX "PlanStep_pathId_idx" ON "public"."PlanStep"("pathId");

-- CreateIndex
CREATE INDEX "PlanStep_status_idx" ON "public"."PlanStep"("status");

-- CreateIndex
CREATE INDEX "Checkpoint_planId_idx" ON "public"."Checkpoint"("planId");

-- CreateIndex
CREATE INDEX "Checkpoint_createdAt_idx" ON "public"."Checkpoint"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Plan" ADD CONSTRAINT "Plan_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExecutionPath" ADD CONSTRAINT "ExecutionPath_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanStep" ADD CONSTRAINT "PlanStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "public"."ExecutionPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Checkpoint" ADD CONSTRAINT "Checkpoint_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
