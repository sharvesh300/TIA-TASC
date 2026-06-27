import type { CanonicalRow, ExtractionResult } from "@/types/extraction";
import { buildRow, mapHeaders } from "@/agents/_shared";

// Structured extraction from .csv. Same tolerant header-matching as the Excel
// path — just split on lines/commas instead of reading worksheet cells.
export async function extractCsv(buffer: Buffer): Promise<ExtractionResult> {
  const text = buffer.toString("utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], overallConfidence: 0 };

  let headerRowIdx = 0;
  let headerMapping: ReturnType<typeof mapHeaders> = {};
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cells = splitCsvLine(lines[i]);
    const mapping = mapHeaders(cells);
    if (Object.keys(mapping).length >= 2) {
      headerRowIdx = i;
      headerMapping = mapping;
      break;
    }
  }

  if (Object.keys(headerMapping).length === 0) {
    return { rows: [], overallConfidence: 0 };
  }

  const rows: CanonicalRow[] = [];
  const confidences: number[] = [];

  for (let i = headerRowIdx + 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.every((c) => c === "")) continue;

    const record: Record<string, string | number> = {};
    for (const [idxStr, field] of Object.entries(headerMapping)) {
      if (!field) continue;
      const value = cells[Number(idxStr)];
      if (value !== undefined && value !== "") record[field] = value;
    }
    if (Object.keys(record).length === 0) continue;

    const { row, confidence } = buildRow(record, 1);
    rows.push(row);
    confidences.push(confidence);
  }

  const overallConfidence =
    confidences.length === 0 ? 0 : confidences.reduce((a, b) => a + b, 0) / confidences.length;

  return { rows, overallConfidence };
}

function splitCsvLine(line: string): string[] {
  // Minimal CSV split: handles quoted fields containing commas.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}
