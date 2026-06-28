/**
 * ERP Excel Export — produces a SAP HCM-style .xlsx file from a completed PipelineJob.
 * Two sheets:
 *   1. Payroll_Upload  — one row per employee per wage type (IT0008 format)
 *   2. Metadata        — document header: client, period, confidence, job ID
 */

import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

// ─── SAP field constants ──────────────────────────────────────────────────────

const WAGE_TYPE_BASIC = "/101";
const WAGE_TYPE_OT    = "/110";

const HEADER_BG   = "1F3864"; // dark navy
const HEADER_FG   = "FFFFFF";
const ALT_ROW_BG  = "EEF2FF"; // light indigo
const LOW_CONF_BG = "FEE2E2"; // red-100
const PASS_BG     = "DCFCE7"; // green-100

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pad employee ID to 8-digit SAP PERNR */
function toPernr(empId: string | null | undefined): string {
  if (!empId) return "00000000";
  const digits = empId.replace(/\D/g, "");
  return digits.padStart(8, "0");
}

/** SAP date format: DD.MM.YYYY */
function toSapDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}`;
}

/** Last day of a YYYY-MM period */
function periodEnd(payPeriod: string): Date {
  const [y, mo] = payPeriod.split("-").map(Number);
  return new Date(y, mo, 0); // day 0 of next month = last day of this month
}

/** Department → SAP cost centre code */
function toCostCentre(department: string | null | undefined): string {
  if (!department) return "CC0000";
  const map: Record<string, string> = {
    Operations: "CC1000",
    Logistics:  "CC2000",
    Maintenance:"CC3000",
    "Retail Floor": "CC4000",
    Security:   "CC5000",
    HR:         "CC6000",
    Finance:    "CC7000",
  };
  return map[department] ?? `CC${department.slice(0, 4).toUpperCase().replace(/\s/g, "_")}`;
}

function styleHeader(row: ExcelJS.Row, colCount: number) {
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: HEADER_FG }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "AAAAAA" } },
    };
  }
}

function styleDataRow(row: ExcelJS.Row, colCount: number, alt: boolean, bgOverride?: string) {
  const bg = bgOverride ?? (alt ? ALT_ROW_BG : "FFFFFF");
  row.height = 18;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    cell.font = { size: 10 };
    cell.alignment = { vertical: "middle" };
  }
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function buildErpExcel(jobId: string): Promise<Buffer> {
  // Load job + extracted rows + client
  const job = await prisma.pipelineJob.findUnique({
    where: { id: jobId },
    include: {
      client: true,
      extractedRows: { orderBy: { fullName: "asc" } },
    },
  });

  if (!job) throw new Error(`Job ${jobId} not found`);
  if (job.extractedRows.length === 0) throw new Error("No extracted rows to export");

  const payPeriod = job.extractedRows[0].payPeriod;
  const periodStart = new Date(`${payPeriod}-01`);
  const periodEndDate = periodEnd(payPeriod);
  const beginDate = toSapDate(periodStart);
  const endDate   = toSapDate(periodEndDate);
  const payrollArea = job.client.code.slice(0, 4).toUpperCase();

  // Bulk-load employees and their payroll for this period
  const empIds = job.extractedRows.map((r) => r.empId).filter(Boolean) as string[];

  const employees = await prisma.employee.findMany({
    where: {
      clientId: job.clientId,
      empId: { in: empIds },
    },
  });

  const payrolls = await prisma.payroll.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      payPeriod,
    },
  });

  const empById   = new Map(employees.map((e) => [e.empId, e]));
  const payByEmpId = new Map(payrolls.map((p) => [p.employeeId, p]));

  // ── Build workbook ──────────────────────────────────────────────────────────

  const wb = new ExcelJS.Workbook();
  wb.creator    = "TIA — Touchless Invoice Agent";
  wb.lastModifiedBy = "TIA";
  wb.created    = new Date();
  wb.modified   = new Date();

  // ═══════════════════════════════════════════════════════════════════
  // Sheet 1: Payroll_Upload
  // ═══════════════════════════════════════════════════════════════════

  const ws = wb.addWorksheet("Payroll_Upload", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "PERNR",  key: "pernr",  width: 12 },
    { header: "ENAME",  key: "ename",  width: 28 },
    { header: "KOSTL",  key: "kostl",  width: 10 },
    { header: "LGART",  key: "lgart",  width: 8  },
    { header: "ANZHL",  key: "anzhl",  width: 10 },
    { header: "BETRG",  key: "betrg",  width: 14 },
    { header: "WAERS",  key: "waers",  width: 8  },
    { header: "ABKRS",  key: "abkrs",  width: 8  },
    { header: "BEGDA",  key: "begda",  width: 12 },
    { header: "ENDDA",  key: "endda",  width: 12 },
    { header: "CONF%",  key: "conf",   width: 10 },
    { header: "VERIFIED", key: "verified", width: 10 },
  ];
  ws.columns = columns;

  // Style header
  styleHeader(ws.getRow(1), columns.length);

  let rowIdx = 0;
  let overallConfSum = 0;
  let overallConfCount = 0;

  for (const extractedRow of job.extractedRows) {
    const emp     = empById.get(extractedRow.empId ?? "");
    const payroll = emp ? payByEmpId.get(emp.id) : undefined;

    const pernr   = toPernr(extractedRow.empId);
    const ename   = extractedRow.fullName;
    const kostl   = toCostCentre(emp?.department);
    const waers   = extractedRow.currency || "AED";
    const abkrs   = payrollArea;
    const conf    = Number(extractedRow.overallConfidence);
    const verified = extractedRow.humanVerified;

    overallConfSum   += conf;
    overallConfCount += 1;

    const isLowConf = conf < 0.85;
    const confPct   = `${(conf * 100).toFixed(0)}%`;

    // Row A: Basic pay (wage type /101)
    const basicPay = payroll ? Number(payroll.netPay) : 0;
    const workDays = Number(extractedRow.workingDays);

    rowIdx++;
    const rowA = ws.addRow({
      pernr,
      ename,
      kostl,
      lgart: WAGE_TYPE_BASIC,
      anzhl: workDays,
      betrg: basicPay,
      waers,
      abkrs,
      begda: beginDate,
      endda: endDate,
      conf:  confPct,
      verified: verified ? "YES" : "NO",
    });
    styleDataRow(rowA, columns.length, rowIdx % 2 === 0, isLowConf ? LOW_CONF_BG : undefined);

    // Right-align numeric columns
    rowA.getCell("anzhl").alignment = { horizontal: "right" };
    rowA.getCell("betrg").alignment = { horizontal: "right" };
    rowA.getCell("betrg").numFmt   = "#,##0.00";
    rowA.getCell("conf").alignment  = { horizontal: "center" };
    if (isLowConf) {
      rowA.getCell("conf").font = { color: { argb: "DC2626" }, bold: true, size: 10 };
    }

    // Row B: OT pay (wage type /110) — only if OT hours exist
    const otHours = Number(extractedRow.otHours);
    if (otHours > 0) {
      const otPay = payroll ? Number(payroll.otAmount) : 0;

      rowIdx++;
      const rowB = ws.addRow({
        pernr,
        ename,
        kostl,
        lgart: WAGE_TYPE_OT,
        anzhl: otHours,
        betrg: otPay,
        waers,
        abkrs,
        begda: beginDate,
        endda: endDate,
        conf:  confPct,
        verified: verified ? "YES" : "NO",
      });
      styleDataRow(rowB, columns.length, rowIdx % 2 === 0, isLowConf ? LOW_CONF_BG : undefined);

      rowB.getCell("anzhl").alignment = { horizontal: "right" };
      rowB.getCell("betrg").alignment = { horizontal: "right" };
      rowB.getCell("betrg").numFmt   = "#,##0.00";
      rowB.getCell("conf").alignment  = { horizontal: "center" };
    }
  }

  // Totals row
  const totalRow = ws.addRow({
    pernr: "TOTAL",
    ename: `${job.extractedRows.length} employee(s)`,
    kostl: "",
    lgart: "",
    anzhl: "",
    betrg: { formula: `SUM(F2:F${ws.rowCount})` },
    waers: job.extractedRows[0]?.currency || "AED",
    abkrs: "",
    begda: "",
    endda: "",
    conf: overallConfCount > 0
      ? `${((overallConfSum / overallConfCount) * 100).toFixed(0)}%`
      : "—",
    verified: "",
  });
  totalRow.height = 20;
  for (let c = 1; c <= columns.length; c++) {
    const cell = totalRow.getCell(c);
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D1D5DB" } };
    cell.border = { top: { style: "medium", color: { argb: "6B7280" } } };
  }
  totalRow.getCell("betrg").numFmt = "#,##0.00";

  // ═══════════════════════════════════════════════════════════════════
  // Sheet 2: Metadata
  // ═══════════════════════════════════════════════════════════════════

  const meta = wb.addWorksheet("Metadata");
  meta.columns = [
    { key: "field", width: 28 },
    { key: "value", width: 40 },
  ];

  const avgConf = overallConfCount > 0 ? (overallConfSum / overallConfCount) : 0;
  const confStatus = avgConf >= 0.9 ? "AUTO-APPROVED" : avgConf >= 0.7 ? "HUMAN REVIEWED" : "LOW CONFIDENCE";

  const metaRows: [string, string | number][] = [
    ["Export type",       "SAP HCM Payroll Upload (IT0008)"],
    ["Generated by",      "TIA — Touchless Invoice Agent"],
    ["Export timestamp",  new Date().toISOString()],
    ["Job ID",            job.id],
    ["Client name",       job.client.name],
    ["Client code",       job.client.code],
    ["Pay period",        payPeriod],
    ["Period start",      beginDate],
    ["Period end",        endDate],
    ["Payroll area",      payrollArea],
    ["Source channel",    job.sourceChannel],
    ["Extraction engine", job.engineUsed],
    ["Employee count",    job.extractedRows.length],
    ["Total rows",        rowIdx],
    ["Avg. AI confidence", `${(avgConf * 100).toFixed(1)}%`],
    ["Confidence status", confStatus],
    ["Low-conf rows",     job.extractedRows.filter((r) => Number(r.overallConfidence) < 0.85).length],
    ["Human verified",    job.extractedRows.filter((r) => r.humanVerified).length],
    ["Currency",          job.extractedRows[0]?.currency || "AED"],
  ];

  // Header
  const metaHeader = meta.addRow(["Field", "Value"]);
  styleHeader(metaHeader, 2);

  metaRows.forEach(([field, value], i) => {
    const r = meta.addRow({ field, value: String(value) });
    r.height = 18;

    const isConf = field === "Confidence status";
    const bg = isConf
      ? confStatus === "AUTO-APPROVED" ? PASS_BG
        : confStatus === "HUMAN REVIEWED" ? "FEF9C3"
        : LOW_CONF_BG
      : i % 2 === 0 ? "F9FAFB" : "FFFFFF";

    for (let c = 1; c <= 2; c++) {
      r.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      r.getCell(c).font = { size: 10 };
    }
    r.getCell(1).font = { bold: true, size: 10, color: { argb: "374151" } };
  });

  // ── Serialize ───────────────────────────────────────────────────────────────

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Suggested filename for the export */
export function erpExportFilename(clientCode: string, payPeriod: string): string {
  return `TIA_SAP_${clientCode}_${payPeriod}.xlsx`;
}
