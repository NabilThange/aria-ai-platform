-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "activeAgent" TEXT,
ADD COLUMN     "agentExecutions" JSONB,
ADD COLUMN     "totalCost" DOUBLE PRECISION;
