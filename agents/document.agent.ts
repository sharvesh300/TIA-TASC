import type { DocumentFormat } from "@/lib/generated/prisma/client";
import type { ExtractionResult } from "@/types/extraction";
import { extractExcel } from "@/agents/excel.extractor";
import { extractCsv } from "@/agents/csv.extractor";
import { extractPdf } from "@/agents/pdf.extractor";
import { extractVision } from "@/agents/vision.extractor";

// CSV rides the XLSX DocumentFormat (no schema migration needed) — we tell
// the two apart by file extension at the routing layer.
export async function routeDocument(
  format: DocumentFormat,
  buffer: Buffer,
  fileName?: string | null
): Promise<ExtractionResult> {
  switch (format) {
    case "XLSX":
      if (fileName?.toLowerCase().endsWith(".csv")) return extractCsv(buffer);
      return extractExcel(buffer);
    case "PDF":
      return extractPdf(buffer);
    case "IMAGE":
      return extractVision(buffer);
    default:
      throw new Error(`Unsupported document format: ${format}`);
  }
}
