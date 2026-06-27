// Shared helpers for turning raw extracted data (spreadsheet rows or OCR text)
// into CanonicalRow[] with a confidence estimate. Header matching is tolerant of
// case, whitespace, and common synonyms so "messy" sheets still parse.
import type { CanonicalRow } from "@/types/extraction";

// Must match the seeded Payroll.payPeriod so invoice generation can join payroll.
export const DEFAULT_PAY_PERIOD = "2026-06";
export const DEFAULT_CURRENCY = "AED";

type CanonicalField = "empId" | "fullName" | "payPeriod" | "workingDays" | "otHours" | "currency";

const HEADER_SYNONYMS: Record<CanonicalField, string[]> = {
  empId: ["empid", "employeeid", "empno", "employeeno", "staffid", "id", "employeecode"],
  fullName: ["fullname", "name", "employeename", "employee", "staffname"],
  payPeriod: ["payperiod", "period", "month", "payrollmonth"],
  workingDays: ["workingdays", "days", "daysworked", "workdays", "noofdays"],
  otHours: ["othours", "overtimehours", "overtime", "ot", "othrs"],
  currency: ["currency", "ccy", "curr"],
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
 * based on how many required fields are present and well-formed. */
export function buildRow(
  record: Partial<Record<CanonicalField, string | number>>,
  baseConfidence = 1
): { row: CanonicalRow; confidence: number } {
  const fullName = String(record.fullName ?? "").trim();
  const empId = record.empId != null ? String(record.empId).trim() : undefined;
  const workingDays = toNumber(record.workingDays);
  const otHours = toNumber(record.otHours);

  let present = 0;
  if (empId) present++;
  if (fullName) present++;
  if (record.workingDays != null && !Number.isNaN(workingDays)) present++;
  const completeness = present / REQUIRED_FIELDS.length;

  const row: CanonicalRow = {
    empId,
    fullName: fullName || "(unknown)",
    payPeriod: String(record.payPeriod ?? DEFAULT_PAY_PERIOD),
    workingDays: Number.isNaN(workingDays) ? 0 : workingDays,
    otHours: Number.isNaN(otHours) ? 0 : otHours,
    currency: String(record.currency ?? DEFAULT_CURRENCY),
    rawData: record as Record<string, unknown>,
  };

  return { row, confidence: baseConfidence * completeness };
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
