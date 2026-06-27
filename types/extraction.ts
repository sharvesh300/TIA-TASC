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
  rawData?: Record<string, unknown>;
}

export interface ExtractionResult {
  rows: CanonicalRow[];
  overallConfidence: number;
}
