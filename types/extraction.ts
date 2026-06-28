import type { BillingPeriodType } from "@/lib/constants";

export interface FieldConfidence<T> {
  value: T;
  confidence: number;
}

export interface CanonicalRow {
  empId?: string;
  fullName: string;
  payPeriod: string;
  workingDays: number;
  otHours: number;
  currency: string;
  /** ISO date (YYYY-MM-DD) for a single source row, when the source gave a
   * per-day entry — used by normalizeRowsToPeriod to bucket rows by the
   * contract's billing cadence rather than assuming one period per file. */
  date?: string;
  rawData?: Record<string, unknown>;
}

export interface ExtractionResult {
  rows: CanonicalRow[];
  overallConfidence: number;
}

/** Contract-derived context passed into extractors so parsing can adapt to
 * the client's actual billing cadence instead of assuming monthly. */
export interface ExtractionContext {
  billingPeriodType: BillingPeriodType;
  standardHoursPerShift: number;
  /** Canonical payPeriod key for "now", used when a row carries no explicit
   * per-day date (i.e. the whole file represents a single period). */
  defaultPayPeriod: string;
}
