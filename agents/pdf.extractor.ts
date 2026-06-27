import type { ExtractionResult } from "@/types/extraction";

// Phase 2 — GPT-4o structured output extraction from PDF timesheets.
export async function extractPdf(_buffer: Buffer): Promise<ExtractionResult> {
  throw new Error("extractPdf not implemented yet");
}
