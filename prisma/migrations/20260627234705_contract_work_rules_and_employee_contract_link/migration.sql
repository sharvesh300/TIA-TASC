-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "workRules" JSONB;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "contractId" TEXT;

-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN     "otHours" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Employee_contractId_idx" ON "Employee"("contractId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
