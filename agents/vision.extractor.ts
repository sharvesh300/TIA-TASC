import type { ExtractionResult } from "@/types/extraction";
import { parseOcrText } from "@/agents/_shared";
import { runTesseract } from "@/agents/ocr.tesseract";

// Image timesheets (photos, scans, screenshots): Tesseract OCR → heuristic parse.
// Low confidence or no rows triggers GPT-4o escalation in the extraction service.
export async function extractVision(buffer: Buffer): Promise<ExtractionResult> {
  const ocr = await runTesseract(buffer);
  const { rows, confidence } = parseOcrText(ocr.text, ocr.meanConfidence);
  return { rows, overallConfidence: confidence };
}
