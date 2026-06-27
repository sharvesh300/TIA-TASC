// Local filesystem storage helper. No cloud object store is configured for the
// MVP, so uploaded timesheets and generated invoice PDFs live under ./storage.
// Stored paths are relative (e.g. "uploads/<jobId>/file.xlsx") and saved on the
// PipelineJob.fileUrl / Invoice.pdfUrl columns.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function resolveSafe(relativePath: string): string {
  const full = path.join(STORAGE_ROOT, relativePath);
  if (!full.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid storage path");
  }
  return full;
}

/** Persist bytes under storage/<relativePath>, creating parent dirs. Returns the relative path. */
export async function saveFile(relativePath: string, data: Buffer | Uint8Array): Promise<string> {
  const full = resolveSafe(relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return relativePath;
}

/** Read bytes for a previously stored relative path. */
export async function readStoredFile(relativePath: string): Promise<Buffer> {
  return readFile(resolveSafe(relativePath));
}

export function uploadPath(jobId: string, fileName: string): string {
  // Strip any directory components from the original file name.
  const safeName = path.basename(fileName);
  return path.join("uploads", jobId, safeName);
}

export function invoicePath(invoiceId: string): string {
  return path.join("invoices", `${invoiceId}.pdf`);
}
