export const CONFIDENCE_THRESHOLDS = {
  AUTO_PROCEED: 0.9,
  NEEDS_REVIEW: 0.7,
} as const;

export const VALIDATION_RULE_CODES = {
  TOTALS_MATCH: "TOTALS_MATCH",
  REQUIRED_FIELDS_PRESENT: "REQUIRED_FIELDS_PRESENT",
  WORKING_DAYS_IN_RANGE: "WORKING_DAYS_IN_RANGE",
  NO_DUPLICATE_EMPLOYEE: "NO_DUPLICATE_EMPLOYEE",
  OVERTIME_NOT_ALLOWED_BUT_PRESENT: "OVERTIME_NOT_ALLOWED_BUT_PRESENT",
  OVERTIME_EXCEEDS_CAP: "OVERTIME_EXCEEDS_CAP",
  NET_WORKTIME_MISMATCH: "NET_WORKTIME_MISMATCH",
} as const;

export const MAX_WORKING_DAYS_PER_PERIOD = 31;

export interface ClientValidationRulesConfig {
  TOTALS_MATCH?: {
    enabled: boolean;
    tolerance: number;
    severity: "BLOCKER" | "WARNING";
  };
  REQUIRED_FIELDS_PRESENT?: {
    enabled: boolean;
    severity: "BLOCKER" | "WARNING";
  };
  WORKING_DAYS_IN_RANGE?: {
    enabled: boolean;
    minDays: number;
    maxDays: number;
    severity: "BLOCKER" | "WARNING";
  };
  NO_DUPLICATE_EMPLOYEE?: {
    enabled: boolean;
    severity: "BLOCKER" | "WARNING";
  };
}

export const DEFAULT_VALIDATION_RULES: ClientValidationRulesConfig = {
  TOTALS_MATCH: { enabled: true, tolerance: 0.01, severity: "BLOCKER" },
  REQUIRED_FIELDS_PRESENT: { enabled: true, severity: "BLOCKER" },
  WORKING_DAYS_IN_RANGE: { enabled: true, minDays: 1, maxDays: 31, severity: "WARNING" },
  NO_DUPLICATE_EMPLOYEE: { enabled: true, severity: "BLOCKER" },
};

// Contract-level work rules — billing terms (markup, payment terms) live as
// direct columns on Contract; everything about how worktime/overtime is
// governed lives here as flexible JSON, mirroring the
// Client.validationRules/dispatchConfig pattern so new rule types don't
// require a migration.
export interface ContractWorkRulesConfig {
  standardHoursPerShift?: number;
  standardHoursPerWeek?: number;
  breakDeductionMinutes?: number;
  overtimeAllowed?: boolean;
  overtimeMultiplier?: number;
  maxOvertimeHoursPerDay?: number;
  maxOvertimeHoursPerWeek?: number;
  shiftAllowance?: number;
  validation?: {
    OVERTIME_NOT_ALLOWED_BUT_PRESENT?: {
      enabled: boolean;
      severity: "BLOCKER" | "WARNING";
    };
    OVERTIME_EXCEEDS_CAP?: {
      enabled: boolean;
      severity: "BLOCKER" | "WARNING";
    };
    NET_WORKTIME_MISMATCH?: {
      enabled: boolean;
      tolerance: number;
      severity: "BLOCKER" | "WARNING";
    };
  };
}

export const DEFAULT_CONTRACT_WORK_RULES: ContractWorkRulesConfig = {
  standardHoursPerShift: 8,
  standardHoursPerWeek: 48,
  breakDeductionMinutes: 30,
  overtimeAllowed: true,
  overtimeMultiplier: 1.5,
  maxOvertimeHoursPerDay: 4,
  maxOvertimeHoursPerWeek: 20,
  shiftAllowance: 0,
  validation: {
    OVERTIME_NOT_ALLOWED_BUT_PRESENT: { enabled: true, severity: "BLOCKER" },
    OVERTIME_EXCEEDS_CAP: { enabled: true, severity: "WARNING" },
    NET_WORKTIME_MISMATCH: { enabled: true, tolerance: 0.05, severity: "WARNING" },
  },
};

export interface DispatchConfigV2 {
  channel: "EMAIL" | "WEBHOOK" | "SFTP";
  format: "PDF" | "CSV" | "JSON";
  sendCopyTo?: string[];
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  webhookRetryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
  sftpConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
    remotePath: string;
  };
  portalEnabled?: boolean;
}

export const DEFAULT_DISPATCH_CONFIG: DispatchConfigV2 = {
  channel: "EMAIL",
  format: "PDF",
  sendCopyTo: [],
};

// Billing cadence — mirrors the Prisma `BillingPeriodType` enum as a string
// union so this file stays decoupled from the generated Prisma client.
export type BillingPeriodType = "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "DAILY";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO-8601 week number (1–53) for a date, per the standard "week containing
 * the first Thursday of the year" rule. */
function isoWeekOf(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** Monday of a given ISO week. */
function dateFromIsoWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * 86400000);
}

/** Canonical `payPeriod` string for a date under a given billing cadence.
 * MONTHLY stays `YYYY-MM` (backward-compatible with existing data). */
export function periodKeyFor(date: Date, type: BillingPeriodType): string {
  switch (type) {
    case "WEEKLY":
    case "BIWEEKLY": {
      const { year, week } = isoWeekOf(date);
      return `${year}-W${pad(week)}`;
    }
    case "DAILY":
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    case "MONTHLY":
    default:
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
  }
}

/** Best-effort reverse of periodKeyFor — a representative Date for a period
 * key, regardless of which cadence produced it. Used to resolve the active
 * contract for an arbitrary payPeriod string. */
export function periodToDate(payPeriod: string): Date {
  const weekMatch = payPeriod.match(/^(\d{4})-W(\d{1,2})$/);
  if (weekMatch) {
    return dateFromIsoWeek(Number(weekMatch[1]), Number(weekMatch[2]));
  }
  const dayMatch = payPeriod.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dayMatch) {
    return new Date(Date.UTC(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3])));
  }
  const monthMatch = payPeriod.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    return new Date(Date.UTC(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1));
  }
  return new Date(payPeriod);
}

/** Plausible working-day range for a billing cadence, used as the default
 * for WORKING_DAYS_IN_RANGE when the client hasn't overridden it. */
export function expectedDayRange(type: BillingPeriodType): { minDays: number; maxDays: number } {
  switch (type) {
    case "WEEKLY":
      return { minDays: 1, maxDays: 7 };
    case "BIWEEKLY":
      return { minDays: 1, maxDays: 14 };
    case "DAILY":
      return { minDays: 1, maxDays: 1 };
    case "MONTHLY":
    default:
      return { minDays: 1, maxDays: 31 };
  }
}

/** Convert an hour figure to working days using the contract's standard
 * shift length (e.g. "Week 1 – 8 hrs" with an 8h shift → 1 day). */
export function hoursToDays(hours: number, standardHoursPerShift: number): number {
  if (!Number.isFinite(hours) || !Number.isFinite(standardHoursPerShift) || standardHoursPerShift <= 0) {
    return 0;
  }
  return hours / standardHoursPerShift;
}
