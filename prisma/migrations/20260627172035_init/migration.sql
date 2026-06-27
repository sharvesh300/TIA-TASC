-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'FINOPS', 'REVIEWER', 'CLIENT');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SourceChannel" AS ENUM ('PORTAL', 'EMAIL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "DocumentFormat" AS ENUM ('XLSX', 'PDF', 'IMAGE', 'EMAIL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('UPLOADED', 'QUEUED', 'EXTRACTING', 'NEEDS_REVIEW', 'EXTRACTED', 'GENERATING_INVOICE', 'VALIDATING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'VALIDATED', 'DISPATCHED', 'APPROVED', 'REJECTED', 'QUERIED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PASS', 'WARNING', 'BLOCKER');

-- CreateEnum
CREATE TYPE "ExtractionEngine" AS ENUM ('NONE', 'EXCEL', 'TESSERACT', 'GPT4O');

-- CreateEnum
CREATE TYPE "PipelineEventType" AS ENUM ('INGESTED', 'EXTRACTION_STARTED', 'EXTRACTION_COMPLETED', 'ESCALATED_TO_GPT', 'FLAGGED_FOR_REVIEW', 'REVIEW_RESOLVED', 'INVOICE_GENERATED', 'VALIDATION_RUN', 'DISPATCHED', 'FAILED');

-- CreateEnum
CREATE TYPE "EventActor" AS ENUM ('SYSTEM', 'AI', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "industry" TEXT,
    "contactEmail" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "dispatchConfig" JSONB,
    "validationRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "empId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "clientId" TEXT NOT NULL,
    "jobTitle" TEXT,
    "department" TEXT,
    "nationality" TEXT,
    "dateOfJoining" TIMESTAMP(3),
    "iban" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "basic" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "housing" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "transport" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "food" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "phone" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "gross" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "workingDays" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineJob" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sourceChannel" "SourceChannel" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "format" "DocumentFormat" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'UPLOADED',
    "engineUsed" "ExtractionEngine" NOT NULL DEFAULT 'NONE',
    "failureReason" TEXT,
    "originalFileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedRow" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "empId" TEXT,
    "fullName" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "workingDays" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "overallConfidence" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "sourceType" "DocumentFormat" NOT NULL,
    "fieldsJson" JSONB,
    "rawData" JSONB,
    "humanVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractedRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "billingModel" TEXT NOT NULL DEFAULT 'MARKUP_PERCENT',
    "markupPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "pipelineJobId" TEXT,
    "contractId" TEXT,
    "payPeriod" TEXT NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "employeeId" TEXT,
    "empId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "gross" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "billedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "workingDays" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "PipelineEventType" NOT NULL,
    "fromStatus" "JobStatus",
    "toStatus" "JobStatus",
    "actor" "EventActor" NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "message" TEXT,
    "confidence" DECIMAL(65,30),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationResult" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "ruleLabel" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL,
    "expected" TEXT,
    "actual" TEXT,
    "resolvedBy" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_code_key" ON "Client"("code");

-- CreateIndex
CREATE INDEX "Employee_clientId_idx" ON "Employee"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_clientId_empId_key" ON "Employee"("clientId", "empId");

-- CreateIndex
CREATE INDEX "Payroll_employeeId_idx" ON "Payroll"("employeeId");

-- CreateIndex
CREATE INDEX "Payroll_payPeriod_idx" ON "Payroll"("payPeriod");

-- CreateIndex
CREATE INDEX "PipelineJob_status_idx" ON "PipelineJob"("status");

-- CreateIndex
CREATE INDEX "PipelineJob_clientId_idx" ON "PipelineJob"("clientId");

-- CreateIndex
CREATE INDEX "ExtractedRow_jobId_idx" ON "ExtractedRow"("jobId");

-- CreateIndex
CREATE INDEX "ExtractedRow_clientId_idx" ON "ExtractedRow"("clientId");

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_clientId_validFrom_key" ON "Contract"("clientId", "validFrom");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_contractId_idx" ON "Invoice"("contractId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_clientId_payPeriod_key" ON "Invoice"("clientId", "payPeriod");

-- CreateIndex
CREATE INDEX "PipelineEvent_jobId_idx" ON "PipelineEvent"("jobId");

-- CreateIndex
CREATE INDEX "ValidationResult_invoiceId_idx" ON "ValidationResult"("invoiceId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineJob" ADD CONSTRAINT "PipelineJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedRow" ADD CONSTRAINT "ExtractedRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PipelineJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedRow" ADD CONSTRAINT "ExtractedRow_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_pipelineJobId_fkey" FOREIGN KEY ("pipelineJobId") REFERENCES "PipelineJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEvent" ADD CONSTRAINT "PipelineEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PipelineJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationResult" ADD CONSTRAINT "ValidationResult_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
