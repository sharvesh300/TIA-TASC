export interface InvoiceLineInput {
  employeeId?: string;
  empId: string;
  employeeName: string;
  gross: number;
  otAmount: number;
  deductions: number;
  netPay: number;
  workingDays: number;
}

export interface ValidationOutcome {
  ruleCode: string;
  ruleLabel: string;
  status: "PASS" | "WARNING" | "BLOCKER";
  expected?: string;
  actual?: string;
}
