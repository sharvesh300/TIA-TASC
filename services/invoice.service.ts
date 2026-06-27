// Invoice generation. Joins each extracted timesheet row to its Employee and that
// period's Payroll to build invoice lines, applies contract markup to compute billed amounts,
// creates a DRAFT Invoice, and advances the job to VALIDATING.
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CURRENCY, DEFAULT_PAY_PERIOD } from "@/agents/_shared";
import { getJobWithRelations } from "@/repositories/job.repo";
import { getPayroll } from "@/repositories/payroll.repo";
import { createInvoice, getInvoiceByClientPeriod } from "@/repositories/invoice.repo";
import { getActiveContract } from "@/repositories/contract.repo";
import { transition } from "@/services/pipeline.service";
import { resolveEmployeeMatch } from "@/services/employee-match.service";

export class InvoiceGenerationBlockedError extends Error {}

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

  // Load active contract for this client at the pay period date. Missing
  // contract is a fixable setup issue, not a hard failure — bounce the job
  // back to NEEDS_REVIEW so it surfaces in the inbox instead of FAILED.
  const payPeriodDate = new Date(`${payPeriod}-01`);
  const contract = await getActiveContract(job.clientId, payPeriodDate);
  if (!contract) {
    await transition(jobId, "NEEDS_REVIEW", {
      type: "FLAGGED_FOR_REVIEW",
      actor: "SYSTEM",
      actorId,
      message: `No active contract for this client covering ${payPeriod} — assign a contract, then resume.`,
    });
    throw new InvoiceGenerationBlockedError(
      `No active contract found for client ${job.clientId} on ${payPeriod}`
    );
  }

  const lines: Prisma.InvoiceLineCreateWithoutInvoiceInput[] = [];
  let totalBilled = 0;
  const markupPercent = Number(contract.markupPercent) || 0;
  const unresolvedRows: string[] = [];

  for (const row of job.extractedRows) {
    const match = await resolveEmployeeMatch(job.clientId, {
      empId: row.empId,
      fullName: row.fullName,
    });

    if (match.status !== "MATCHED") {
      unresolvedRows.push(
        match.status === "AMBIGUOUS"
          ? `${row.fullName} (${row.empId ?? "no id"}) matches ${match.candidates.length} employees — needs manual pick`
          : `${row.fullName} (${row.empId ?? "no id"}) — no matching employee found`
      );
      continue;
    }

    const employee = match.employee!;
    const payroll = await getPayroll(employee.id, payPeriod);

    const gross = payroll ? Number(payroll.gross) : 0;
    const otAmount = payroll ? Number(payroll.otAmount) : 0;
    const deductions = payroll ? Number(payroll.deductions) : 0;
    const netPay = payroll ? Number(payroll.netPay) : 0;

    // Compute billedAmount using contract markup: billedAmount = netPay × (1 + markupPercent/100)
    const billedAmount = netPay * (1 + markupPercent / 100);
    totalBilled += billedAmount;

    lines.push({
      employee: { connect: { id: employee.id } },
      empId: employee.empId,
      employeeName: employee.fullName,
      gross,
      otAmount,
      deductions,
      netPay,
      billedAmount,
      workingDays: Number(row.workingDays),
    });
  }

  // Any row we couldn't confidently resolve to an employee blocks invoicing —
  // bounce to NEEDS_REVIEW with the specifics rather than silently shipping a
  // zero-amount line that would just trip the validation blocker downstream.
  if (unresolvedRows.length > 0) {
    await transition(jobId, "NEEDS_REVIEW", {
      type: "FLAGGED_FOR_REVIEW",
      actor: "SYSTEM",
      actorId,
      message: `${unresolvedRows.length} row(s) could not be matched to an employee`,
      metadata: { unresolvedRows },
    });
    throw new InvoiceGenerationBlockedError(
      `${unresolvedRows.length} row(s) could not be matched to an employee`
    );
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
    contract: { connect: { id: contract.id } },
    payPeriod,
    totalAmount: totalBilled,
    currency,
    status: "DRAFT",
    lines: { create: lines },
  });

  await transition(jobId, "VALIDATING", {
    type: "INVOICE_GENERATED",
    actor: "SYSTEM",
    actorId,
    message: `Invoice created: ${currency} ${totalBilled.toFixed(2)} (${lines.length} lines, ${markupPercent}% markup)`,
    metadata: { invoiceId: invoice.id, total: totalBilled, currency, payPeriod, contractId: contract.id },
  });

  return invoice;
}
