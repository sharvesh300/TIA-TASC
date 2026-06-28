// Validation stage. Runs a rule engine over a DRAFT invoice using per-client validation rules.
// Writes ValidationResult rows, and — if no BLOCKER — marks the invoice VALIDATED.
import type { Prisma, ValidationStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  VALIDATION_RULE_CODES,
  DEFAULT_VALIDATION_RULES,
  DEFAULT_CONTRACT_WORK_RULES,
  type ClientValidationRulesConfig,
  type ContractWorkRulesConfig,
} from "@/lib/constants";
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

  // Load client-specific rules or use defaults
  const client = await prisma.client.findUnique({ where: { id: invoice.clientId } });
  if (!client) throw new Error(`Client ${invoice.clientId} not found`);

  const clientRules: ClientValidationRulesConfig = client.validationRules
    ? JSON.parse(JSON.stringify(client.validationRules))
    : DEFAULT_VALIDATION_RULES;

  const lines = invoice.lines;
  const outcomes: RuleOutcome[] = [];

  // 1. Totals match: invoice total equals the sum of line billed amounts.
  const totalsMatcher = clientRules.TOTALS_MATCH;
  if (totalsMatcher?.enabled !== false) {
    const tolerance = totalsMatcher?.tolerance ?? 0.01;
    const severity = totalsMatcher?.severity ?? "BLOCKER";
    const lineSum = lines.reduce((acc, l) => acc + Number(l.billedAmount), 0);
    const invoiceTotal = Number(invoice.totalAmount);
    outcomes.push({
      ruleCode: VALIDATION_RULE_CODES.TOTALS_MATCH,
      ruleLabel: "Invoice total matches sum of line items",
      status: Math.abs(lineSum - invoiceTotal) < tolerance ? "PASS" : severity,
      expected: invoiceTotal.toFixed(2),
      actual: lineSum.toFixed(2),
    });
  }

  // 2. Required fields present: every line has an employee id and name.
  const fieldsMatcher = clientRules.REQUIRED_FIELDS_PRESENT;
  if (fieldsMatcher?.enabled !== false) {
    const severity = fieldsMatcher?.severity ?? "BLOCKER";
    const missing = lines.filter((l) => !l.empId?.trim() || !l.employeeName?.trim());
    outcomes.push({
      ruleCode: VALIDATION_RULE_CODES.REQUIRED_FIELDS_PRESENT,
      ruleLabel: "All lines have employee id and name",
      status: missing.length === 0 ? "PASS" : severity,
      expected: "0 incomplete lines",
      actual: `${missing.length} incomplete line(s)`,
    });
  }

  // 3. Working days in range: configured per client.
  const daysMatcher = clientRules.WORKING_DAYS_IN_RANGE;
  if (daysMatcher?.enabled !== false) {
    const minDays = daysMatcher?.minDays ?? 1;
    const maxDays = daysMatcher?.maxDays ?? 31;
    const severity = daysMatcher?.severity ?? "WARNING";
    const outOfRange = lines.filter((l) => {
      const d = Number(l.workingDays);
      return d < minDays || d > maxDays;
    });
    outcomes.push({
      ruleCode: VALIDATION_RULE_CODES.WORKING_DAYS_IN_RANGE,
      ruleLabel: `Working days within ${minDays}–${maxDays}`,
      status: outOfRange.length === 0 ? "PASS" : severity,
      expected: `${minDays}–${maxDays} days`,
      actual: `${outOfRange.length} line(s) out of range`,
    });
  }

  // 4. No duplicate employee on the invoice.
  const dupMatcher = clientRules.NO_DUPLICATE_EMPLOYEE;
  if (dupMatcher?.enabled !== false) {
    const severity = dupMatcher?.severity ?? "BLOCKER";
    const counts = new Map<string, number>();
    for (const l of lines) counts.set(l.empId, (counts.get(l.empId) ?? 0) + 1);
    const duplicates = [...counts.values()].filter((c) => c > 1).length;
    outcomes.push({
      ruleCode: VALIDATION_RULE_CODES.NO_DUPLICATE_EMPLOYEE,
      ruleLabel: "No duplicate employees",
      status: duplicates === 0 ? "PASS" : severity,
      expected: "0 duplicates",
      actual: `${duplicates} duplicated employee id(s)`,
    });
  }

  // Contract-side work rules (overtime/worktime governance). These come from
  // the contract attached to the invoice at generation time; if there's no
  // contract or no workRules configured, fall back to sane defaults rather
  // than skipping the checks outright.
  const contract = invoice.contractId
    ? await prisma.contract.findUnique({ where: { id: invoice.contractId } })
    : null;
  const workRules: ContractWorkRulesConfig = contract?.workRules
    ? JSON.parse(JSON.stringify(contract.workRules))
    : DEFAULT_CONTRACT_WORK_RULES;
  const workRuleValidation = workRules.validation ?? DEFAULT_CONTRACT_WORK_RULES.validation!;

  // 5. Overtime present despite the contract not allowing it.
  const otNotAllowedMatcher = workRuleValidation.OVERTIME_NOT_ALLOWED_BUT_PRESENT;
  if (otNotAllowedMatcher?.enabled !== false && workRules.overtimeAllowed === false) {
    const severity = otNotAllowedMatcher?.severity ?? "BLOCKER";
    const withOvertime = lines.filter((l) => Number(l.otHours) > 0);
    outcomes.push({
      ruleCode: VALIDATION_RULE_CODES.OVERTIME_NOT_ALLOWED_BUT_PRESENT,
      ruleLabel: "Overtime not allowed by contract",
      status: withOvertime.length === 0 ? "PASS" : severity,
      expected: "0 lines with overtime",
      actual: `${withOvertime.length} line(s) with overtime hours`,
    });
  }

  // 6. Overtime hours exceed the contract's per-period cap (derived from the
  // per-day cap × the line's working days).
  const otCapMatcher = workRuleValidation.OVERTIME_EXCEEDS_CAP;
  if (otCapMatcher?.enabled !== false && workRules.overtimeAllowed !== false) {
    const severity = otCapMatcher?.severity ?? "WARNING";
    const maxOtPerDay = workRules.maxOvertimeHoursPerDay ?? DEFAULT_CONTRACT_WORK_RULES.maxOvertimeHoursPerDay!;
    const overCap = lines.filter((l) => Number(l.otHours) > maxOtPerDay * Number(l.workingDays));
    outcomes.push({
      ruleCode: VALIDATION_RULE_CODES.OVERTIME_EXCEEDS_CAP,
      ruleLabel: `Overtime within ${maxOtPerDay}h/day cap`,
      status: overCap.length === 0 ? "PASS" : severity,
      expected: `≤ ${maxOtPerDay}h/day`,
      actual: `${overCap.length} line(s) over cap`,
    });
  }

  // 7. Net worktime mismatch: cross-validate payroll's otAmount against what
  // the contract's overtime multiplier would produce for the recorded
  // overtime hours, instead of trusting otAmount verbatim.
  const netWorktimeMatcher = workRuleValidation.NET_WORKTIME_MISMATCH;
  if (netWorktimeMatcher?.enabled !== false) {
    const tolerance = netWorktimeMatcher?.tolerance ?? 0.05;
    const severity = netWorktimeMatcher?.severity ?? "WARNING";
    const standardHours = workRules.standardHoursPerShift ?? DEFAULT_CONTRACT_WORK_RULES.standardHoursPerShift!;
    const otMultiplier = workRules.overtimeMultiplier ?? DEFAULT_CONTRACT_WORK_RULES.overtimeMultiplier!;
    const mismatches = lines.filter((l) => {
      const workingDays = Number(l.workingDays);
      const otHours = Number(l.otHours);
      if (otHours <= 0 || workingDays <= 0 || standardHours <= 0) return false;
      const hourlyRate = Number(l.gross) / (standardHours * workingDays);
      if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return false;
      const expectedOtAmount = otHours * hourlyRate * otMultiplier;
      const actualOtAmount = Number(l.otAmount);
      const diff = Math.abs(expectedOtAmount - actualOtAmount);
      return diff > tolerance * Math.max(expectedOtAmount, 1);
    });
    outcomes.push({
      ruleCode: VALIDATION_RULE_CODES.NET_WORKTIME_MISMATCH,
      ruleLabel: "Overtime amount matches contract worktime rules",
      status: mismatches.length === 0 ? "PASS" : severity,
      expected: `within ${(tolerance * 100).toFixed(0)}% of contract-derived OT amount`,
      actual: `${mismatches.length} line(s) mismatched`,
    });
  }

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
      // A blocker is a fixable data issue, not a system failure — surface it
      // in the inbox as NEEDS_REVIEW rather than leaving the job stuck in
      // VALIDATING with no path forward.
      await transition(invoice.pipelineJobId, "NEEDS_REVIEW", {
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
