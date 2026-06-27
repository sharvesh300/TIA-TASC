import type { DocumentFormat } from "@/lib/generated/prisma/client";
import type { ExtractionResult } from "@/types/extraction";
import { extractExcel } from "@/agents/excel.extractor";
import { extractPdf } from "@/agents/pdf.extractor";
import { extractVision } from "@/agents/vision.extractor";

export async function routeDocument(format: DocumentFormat, buffer: Buffer): Promise<ExtractionResult> {
  switch (format) {
    case "XLSX":
      return extractExcel(buffer);
    case "PDF":
      return extractPdf(buffer);
    case "IMAGE":
      return extractVision(buffer);
    default:
      throw new Error(`Unsupported document format: ${format}`);
  }
}
