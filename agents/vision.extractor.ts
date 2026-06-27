import type { ExtractionResult } from "@/types/extraction";

// Phase 2 — GPT-4o vision extraction from images/handwriting.
export async function extractVision(_buffer: Buffer): Promise<ExtractionResult> {
  throw new Error("extractVision not implemented yet");
}
