import { createWorker } from "tesseract.js";

export interface OcrResult {
  text: string;
  meanConfidence: number; // 0–1
}

// Run Tesseract OCR over an image buffer. Tesseract reports word confidence on a
// 0–100 scale; we normalize to 0–1 to match the pipeline's confidence model.
export async function runTesseract(buffer: Buffer): Promise<OcrResult> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(buffer);
    return {
      text: data.text ?? "",
      meanConfidence: typeof data.confidence === "number" ? data.confidence / 100 : 0,
    };
  } finally {
    await worker.terminate();
  }
}
