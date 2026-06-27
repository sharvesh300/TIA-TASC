import type { CanonicalRow, ExtractionResult } from "@/types/extraction";
import { parseOcrText } from "@/agents/_shared";
import { runTesseract } from "@/agents/ocr.tesseract";

// PDF timesheets. Prefer the embedded text layer (exact, high confidence). If the
// PDF is a scan with no text, rasterize the first page and OCR it. Any failure
// returns low confidence so the extraction service escalates to GPT-4o.
export async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const text = await extractPdfText(buffer);

  if (text.trim().length > 0) {
    const { rows, confidence } = parseOcrText(text, 0.97);
    if (rows.length > 0) return { rows, overallConfidence: confidence };
  }

  // No usable text layer → try OCR on a rasterized page.
  try {
    const png = await rasterizeFirstPage(buffer);
    const ocr = await runTesseract(png);
    const { rows, confidence } = parseOcrText(ocr.text, ocr.meanConfidence);
    return { rows, overallConfidence: confidence };
  } catch {
    return { rows: [], overallConfidence: 0 };
  }
}

async function loadPdfjs() {
  // Legacy build runs in Node without a DOM. Dynamic import keeps it out of the
  // edge/client bundles.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfjs = await loadPdfjs();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

    const lines: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      // Group text items into lines by their vertical position.
      const byLine = new Map<number, { x: number; str: string }[]>();
      for (const item of content.items as Array<{ str: string; transform: number[] }>) {
        if (!("str" in item)) continue;
        const y = Math.round(item.transform[5]);
        const x = item.transform[4];
        if (!byLine.has(y)) byLine.set(y, []);
        byLine.get(y)!.push({ x, str: item.str });
      }
      const sortedYs = [...byLine.keys()].sort((a, b) => b - a);
      for (const y of sortedYs) {
        const lineStr = byLine
          .get(y)!
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (lineStr) lines.push(lineStr);
      }
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

async function rasterizeFirstPage(buffer: Buffer): Promise<Buffer> {
  const pdfjs = await loadPdfjs();
  const { createCanvas } = await import("@napi-rs/canvas");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  // @napi-rs/canvas implements the 2D context pdfjs needs.
  await page.render({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvasContext: context as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas: canvas as any,
    viewport,
  }).promise;
  return canvas.toBuffer("image/png");
}

// Re-exported for potential reuse/testing.
export type { CanonicalRow };
