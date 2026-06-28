// Shared helpers for turning raw extracted data (spreadsheet rows or OCR text)
// into CanonicalRow[] with a confidence estimate. Header matching is tolerant of
// case, whitespace, and common synonyms so "messy" sheets still parse.
import type { CanonicalRow, ExtractionContext } from "@/types/extraction";
import { hoursToDays, periodKeyFor } from "@/lib/constants";

// Must match the seeded Payroll.payPeriod so invoice generation can join payroll.
export const DEFAULT_PAY_PERIOD = "2026-06";
export const DEFAULT_CURRENCY = "AED";

type CanonicalField =
  | "empId"
  | "fullName"
  | "payPeriod"
  | "workingDays"
  | "otHours"
  | "currency"
  | "hoursWorked"
  | "date";

const HEADER_SYNONYMS: Record<CanonicalField, string[]> = {
  empId: ["empid", "employeeid", "empno", "employeeno", "staffid", "id", "employeecode"],
  fullName: ["fullname", "name", "employeename", "employee", "staffname"],
  payPeriod: ["payperiod", "period", "month", "payrollmonth"],
  workingDays: ["workingdays", "days", "daysworked", "workdays", "noofdays"],
  otHours: ["othours", "overtimehours", "overtime", "ot", "othrs"],
  currency: ["currency", "ccy", "curr"],
  // Some sources report hours worked instead of days (e.g. a weekly "Week 1 –
  // 8 hrs" column) — converted to days in buildRow via standardHoursPerShift.
  hoursWorked: ["hoursworked", "totalhours", "hours", "hrs"],
  date: ["date", "day", "workdate", "attendancedate"],
};

export function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Map a sheet's header cells to canonical field names by index. */
export function mapHeaders(headerCells: string[]): Partial<Record<number, CanonicalField>> {
  const mapping: Partial<Record<number, CanonicalField>> = {};
  headerCells.forEach((cell, idx) => {
    const norm = normalizeHeader(cell ?? "");
    for (const field of Object.keys(HEADER_SYNONYMS) as CanonicalField[]) {
      if (HEADER_SYNONYMS[field].includes(norm)) {
        mapping[idx] = field;
        return;
      }
    }
  });
  return mapping;
}

const REQUIRED_FIELDS: CanonicalField[] = ["empId", "fullName", "workingDays"];

/** Build a CanonicalRow from a field→value record, returning a 0–1 confidence
 * based on how many required fields are present and well-formed.
 * `standardHoursPerShift` converts an hours-denominated source (no
 * `workingDays` but a `hoursWorked` column) into days. */
export function buildRow(
  record: Partial<Record<CanonicalField, string | number>>,
  baseConfidence = 1,
  standardHoursPerShift = 8
): { row: CanonicalRow; confidence: number } {
  const fullName = String(record.fullName ?? "").trim();
  const empId = record.empId != null ? String(record.empId).trim() : undefined;
  let workingDays = toNumber(record.workingDays);
  const otHours = toNumber(record.otHours);
  const hoursWorked = toNumber(record.hoursWorked);
  const hasWorkingDays = record.workingDays != null && !Number.isNaN(workingDays);
  const hasHoursWorked = !hasWorkingDays && record.hoursWorked != null && !Number.isNaN(hoursWorked);

  if (hasHoursWorked) {
    workingDays = hoursToDays(hoursWorked, standardHoursPerShift);
  }

  let present = 0;
  if (empId) present++;
  if (fullName) present++;
  if (hasWorkingDays || hasHoursWorked) present++;
  const completeness = present / REQUIRED_FIELDS.length;

  const date = record.date != null ? String(record.date).trim() : undefined;

  const row: CanonicalRow = {
    empId,
    fullName: fullName || "(unknown)",
    payPeriod: String(record.payPeriod ?? DEFAULT_PAY_PERIOD),
    workingDays: Number.isNaN(workingDays) ? 0 : workingDays,
    otHours: Number.isNaN(otHours) ? 0 : otHours,
    currency: String(record.currency ?? DEFAULT_CURRENCY),
    date: date || undefined,
    rawData: record as Record<string, unknown>,
  };

  return { row, confidence: baseConfidence * completeness };
}

/** Roll source rows up to the contract's billing cadence. Rows carrying an
 * explicit per-day `date` are bucketed by that cadence's period key (so a
 * WEEKLY contract gets one row per ISO week even from a daily-rows file);
 * rows with no date (already a period total) collapse onto the job's
 * canonical period. Same-employee, same-period rows are summed rather than
 * left as duplicates — this is what makes daily/weekly source files behave
 * correctly under a monthly (or any other) contract cadence. */
export function normalizeRowsToPeriod(rows: CanonicalRow[], ctx: ExtractionContext): CanonicalRow[] {
  const byKey = new Map<string, CanonicalRow>();

  for (const r of rows) {
    const periodKey = r.date ? periodKeyFor(new Date(r.date), ctx.billingPeriodType) : ctx.defaultPayPeriod;
    const empKey = r.empId || r.fullName;
    const key = `${empKey}::${periodKey}`;

    const existing = byKey.get(key);
    if (existing) {
      existing.workingDays += r.workingDays;
      existing.otHours += r.otHours;
    } else {
      byKey.set(key, { ...r, payPeriod: periodKey, date: undefined });
    }
  }

  return [...byKey.values()];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    return cleaned === "" ? NaN : Number(cleaned);
  }
  return NaN;
}

/**
 * Heuristic parser for OCR'd text. Each line that contains an employee id token
 * (e.g. EMP0001) becomes a row; the name is the alpha text and the trailing
 * numbers are working days + OT hours.
 */
export function parseOcrText(text: string, baseConfidence: number): { rows: CanonicalRow[]; confidence: number } {
  const rows: CanonicalRow[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const idMatch = line.match(/\bEMP\d{3,}\b/i);
    if (!idMatch) continue;
    const empId = idMatch[0].toUpperCase();
    const rest = line.replace(idMatch[0], " ");
    const numbers = (rest.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
    const name = rest.replace(/\d+(?:\.\d+)?/g, " ").replace(/\s+/g, " ").trim();

    const { row } = buildRow({
      empId,
      fullName: name,
      workingDays: numbers[0],
      otHours: numbers[1] ?? 0,
    });
    rows.push(row);
  }

  // OCR confidence is dominated by the engine's mean character confidence,
  // discounted if we failed to find any structured rows.
  const confidence = rows.length === 0 ? 0 : baseConfidence;
  return { rows, confidence };
}
