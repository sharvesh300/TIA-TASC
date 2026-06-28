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
