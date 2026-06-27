-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_clientId_fkey";

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "clientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
