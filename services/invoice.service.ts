// Invoice generation. Joins each extracted timesheet row to its Employee and that
// period's Payroll to build invoice lines, creates a DRAFT Invoice, and advances
// the job to VALIDATING.
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CURRENCY, DEFAULT_PAY_PERIOD } from "@/agents/_shared";
import { getJobWithRelations } from "@/repositories/job.repo";
import { getEmployeeByClientAndEmpId } from "@/repositories/employee.repo";
import { getPayroll } from "@/repositories/payroll.repo";
import { createInvoice, getInvoiceByClientPeriod } from "@/repositories/invoice.repo";
import { transition } from "@/services/pipeline.service";

export async function generateInvoice(jobId: string, actorId?: string | null) {
  const job = await getJobWithRelations(jobId);
  if (!job) throw new Error(`PipelineJob ${jobId} not found`);
  if (job.status !== "EXTRACTED") {
    throw new Error(`Job must be EXTRACTED to generate an invoice (status: ${job.status})`);
  }
  if (job.extractedRows.length === 0) {
    throw new Error("No extracted rows to invoice");
  }

  await transition(jobId, "GENERATING_INVOICE", {
    type: "INVOICE_GENERATED",
    actor: "SYSTEM",
    actorId,
    message: "Generating invoice from extracted rows",
  });

  const payPeriod = job.extractedRows[0]?.payPeriod || DEFAULT_PAY_PERIOD;
  const currency = job.extractedRows[0]?.currency || DEFAULT_CURRENCY;

  const lines: Prisma.InvoiceLineCreateWithoutInvoiceInput[] = [];
  let total = 0;

  for (const row of job.extractedRows) {
    const employee = row.empId
      ? await getEmployeeByClientAndEmpId(job.clientId, row.empId)
      : null;
    const payroll = employee ? await getPayroll(employee.id, payPeriod) : null;

    const gross = payroll ? Number(payroll.gross) : 0;
    const otAmount = payroll ? Number(payroll.otAmount) : 0;
    const deductions = payroll ? Number(payroll.deductions) : 0;
    const netPay = payroll ? Number(payroll.netPay) : 0;
    total += netPay;

    lines.push({
      ...(employee ? { employee: { connect: { id: employee.id } } } : {}),
      empId: row.empId ?? "",
      employeeName: employee?.fullName ?? row.fullName,
      gross,
      otAmount,
      deductions,
      netPay,
      workingDays: Number(row.workingDays),
    });
  }

  // One invoice per client+period. Regenerating replaces the prior one.
  const existing = await getInvoiceByClientPeriod(job.clientId, payPeriod);
  if (existing) {
    await prisma.$transaction([
      prisma.validationResult.deleteMany({ where: { invoiceId: existing.id } }),
      prisma.invoiceLine.deleteMany({ where: { invoiceId: existing.id } }),
      prisma.invoice.delete({ where: { id: existing.id } }),
    ]);
  }

  const invoice = await createInvoice({
    client: { connect: { id: job.clientId } },
    pipelineJob: { connect: { id: jobId } },
    payPeriod,
    totalAmount: total,
    currency,
    status: "DRAFT",
    lines: { create: lines },
  });

  await transition(jobId, "VALIDATING", {
    type: "INVOICE_GENERATED",
    actor: "SYSTEM",
    actorId,
    message: `Invoice created: ${currency} ${total.toFixed(2)} (${lines.length} lines)`,
    metadata: { invoiceId: invoice.id, total, currency, payPeriod },
  });

  return invoice;
}
