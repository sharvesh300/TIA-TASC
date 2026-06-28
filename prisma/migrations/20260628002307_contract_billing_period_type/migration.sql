-- CreateEnum
CREATE TYPE "BillingPeriodType" AS ENUM ('MONTHLY', 'WEEKLY', 'BIWEEKLY', 'DAILY');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "billingPeriodType" "BillingPeriodType" NOT NULL DEFAULT 'MONTHLY';
