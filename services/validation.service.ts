// Validation stage. Runs a small rule engine over a DRAFT invoice, writes
// ValidationResult rows, and — if no BLOCKER — marks the invoice VALIDATED and
// advances the job to READY_FOR_DISPATCH.
import type { Prisma, ValidationStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_WORKING_DAYS_PER_PERIOD, VALIDATION_RULE_CODES } from "@/lib/constants";
import { getInvoiceById, updateInvoice } from "@/repositories/invoice.repo";
import { recordEvent } from "@/repositories/event.repo";
import { transition } from "@/services/pipeline.service";

interface RuleOutcome {
  ruleCode: string;
  ruleLabel: string;
  status: ValidationStatus;
  expected?: string;
  actual?: string;
}

export async function runValidations(invoiceId: string, actorId?: string | null) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  const lines = invoice.lines;
  const outcomes: RuleOutcome[] = [];

  // 1. Totals match: invoice total equals the sum of line net pay.
  const lineSum = lines.reduce((acc, l) => acc + Number(l.netPay), 0);
  const invoiceTotal = Number(invoice.totalAmount);
  outcomes.push({
    ruleCode: VALIDATION_RULE_CODES.TOTALS_MATCH,
    ruleLabel: "Invoice total matches sum of line items",
    status: Math.abs(lineSum - invoiceTotal) < 0.01 ? "PASS" : "BLOCKER",
    expected: invoiceTotal.toFixed(2),
    actual: lineSum.toFixed(2),
  });

  // 2. Required fields present: every line has an employee id and name.
  const missing = lines.filter((l) => !l.empId?.trim() || !l.employeeName?.trim());
  outcomes.push({
    ruleCode: VALIDATION_RULE_CODES.REQUIRED_FIELDS_PRESENT,
    ruleLabel: "All lines have employee id and name",
    status: missing.length === 0 ? "PASS" : "BLOCKER",
    expected: "0 incomplete lines",
    actual: `${missing.length} incomplete line(s)`,
  });

  // 3. Working days in range: 1..MAX per line.
  const outOfRange = lines.filter((l) => {
    const d = Number(l.workingDays);
    return d <= 0 || d > MAX_WORKING_DAYS_PER_PERIOD;
  });
  outcomes.push({
    ruleCode: VALIDATION_RULE_CODES.WORKING_DAYS_IN_RANGE,
    ruleLabel: `Working days within 1–${MAX_WORKING_DAYS_PER_PERIOD}`,
    status: outOfRange.length === 0 ? "PASS" : "WARNING",
    expected: `1–${MAX_WORKING_DAYS_PER_PERIOD} days`,
    actual: `${outOfRange.length} line(s) out of range`,
  });

  // 4. No duplicate employee on the invoice.
  const counts = new Map<string, number>();
  for (const l of lines) counts.set(l.empId, (counts.get(l.empId) ?? 0) + 1);
  const duplicates = [...counts.values()].filter((c) => c > 1).length;
  outcomes.push({
    ruleCode: VALIDATION_RULE_CODES.NO_DUPLICATE_EMPLOYEE,
    ruleLabel: "No duplicate employees",
    status: duplicates === 0 ? "PASS" : "BLOCKER",
    expected: "0 duplicates",
    actual: `${duplicates} duplicated employee id(s)`,
  });

  // Persist: replace any prior results, then write the new ones.
  await prisma.$transaction([
    prisma.validationResult.deleteMany({ where: { invoiceId } }),
    prisma.validationResult.createMany({
      data: outcomes.map<Prisma.ValidationResultCreateManyInput>((o) => ({
        invoiceId,
        ruleCode: o.ruleCode,
        ruleLabel: o.ruleLabel,
        status: o.status,
        expected: o.expected ?? null,
        actual: o.actual ?? null,
      })),
    }),
  ]);

  const hasBlocker = outcomes.some((o) => o.status === "BLOCKER");
  const summary = summarize(outcomes);

  if (hasBlocker) {
    await updateInvoice(invoiceId, { status: "DRAFT" });
    if (invoice.pipelineJobId) {
      await recordEvent({
        jobId: invoice.pipelineJobId,
        type: "VALIDATION_RUN",
        actor: "SYSTEM",
        actorId,
        message: `Validation failed: ${summary}`,
        metadata: { invoiceId, outcomes } as unknown as Prisma.InputJsonValue,
      });
    }
    return { status: "BLOCKED" as const, outcomes };
  }

  await updateInvoice(invoiceId, { status: "VALIDATED" });
  if (invoice.pipelineJobId) {
    await transition(invoice.pipelineJobId, "READY_FOR_DISPATCH", {
      type: "VALIDATION_RUN",
      actor: "SYSTEM",
      actorId,
      message: `Validation passed: ${summary}`,
      metadata: { invoiceId, outcomes } as unknown as Prisma.InputJsonValue,
    });
  }
  return { status: "VALIDATED" as const, outcomes };
}

function summarize(outcomes: RuleOutcome[]): string {
  const pass = outcomes.filter((o) => o.status === "PASS").length;
  const warn = outcomes.filter((o) => o.status === "WARNING").length;
  const block = outcomes.filter((o) => o.status === "BLOCKER").length;
  return `${pass} passed, ${warn} warning(s), ${block} blocker(s)`;
}
