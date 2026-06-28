import ExcelJS from "exceljs";
import type { CanonicalRow, ExtractionContext, ExtractionResult } from "@/types/extraction";
import { buildRow, mapHeaders } from "@/agents/_shared";

// Structured extraction from .xlsx. No OCR needed — we read cells directly and
// tolerate messy headers. Confidence reflects required-field completeness.
export async function extractExcel(buffer: Buffer, ctx?: ExtractionContext): Promise<ExtractionResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], overallConfidence: 0 };

  // Find the header row: the first row whose cells map to ≥2 known fields.
  let headerRowIdx = 1;
  let headerMapping: Partial<Record<number, ReturnType<typeof mapHeaders>[number]>> = {};
  for (let r = 1; r <= Math.min(ws.rowCount, 10); r++) {
    const cells = rowToStrings(ws.getRow(r));
    const mapping = mapHeaders(cells);
    if (Object.keys(mapping).length >= 2) {
      headerRowIdx = r;
      headerMapping = mapping;
      break;
    }
  }

  if (Object.keys(headerMapping).length === 0) {
    return { rows: [], overallConfidence: 0 };
  }

  const rows: CanonicalRow[] = [];
  const confidences: number[] = [];

  for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
    const cells = rowToStrings(ws.getRow(r));
    if (cells.every((c) => c === "")) continue;

    const record: Record<string, string | number> = {};
    for (const [idxStr, field] of Object.entries(headerMapping)) {
      if (!field) continue;
      const value = cells[Number(idxStr)];
      if (value !== undefined && value !== "") record[field] = value;
    }
    if (Object.keys(record).length === 0) continue;

    const { row, confidence } = buildRow(record, 1, ctx?.standardHoursPerShift);
    rows.push(row);
    confidences.push(confidence);
  }

  const overallConfidence =
    confidences.length === 0 ? 0 : confidences.reduce((a, b) => a + b, 0) / confidences.length;

  return { rows, overallConfidence };
}

function rowToStrings(row: ExcelJS.Row): string[] {
  const out: string[] = [];
  // exceljs is 1-indexed; index 0 is unused. Normalize to 0-based dense array.
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    out[colNumber - 1] = cellText(cell);
  });
  return out.map((v) => v ?? "");
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object" && "text" in v) return String(v.text).trim();
  if (typeof v === "object" && "result" in v) return String(v.result).trim();
  return String(v).trim();
}
