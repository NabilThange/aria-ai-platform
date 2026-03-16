/*
  Warnings:

  - You are about to drop the column `planningEnabled` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the `Checkpoint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExecutionPath` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Plan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlanStep` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Checkpoint" DROP CONSTRAINT "Checkpoint_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExecutionPath" DROP CONSTRAINT "ExecutionPath_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Plan" DROP CONSTRAINT "Plan_taskId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlanStep" DROP CONSTRAINT "PlanStep_pathId_fkey";

-- AlterTable
ALTER TABLE "public"."Task" DROP COLUMN "planningEnabled";

-- DropTable
DROP TABLE "public"."Checkpoint";

-- DropTable
DROP TABLE "public"."ExecutionPath";

-- DropTable
DROP TABLE "public"."Plan";

-- DropTable
DROP TABLE "public"."PlanStep";

-- DropEnum
DROP TYPE "public"."PlanStatus";

-- DropEnum
DROP TYPE "public"."StepStatus";

-- DropEnum
DROP TYPE "public"."StepType";

-- DropEnum
DROP TYPE "public"."Strategy";
