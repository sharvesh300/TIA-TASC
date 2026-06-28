// Object storage helper backed by MinIO (S3-compatible). Uploaded timesheets
// and generated invoice PDFs live in a single bucket under stable object keys
// (e.g. "uploads/<jobId>/file.xlsx"), stored verbatim on PipelineJob.fileUrl /
// Invoice.pdfUrl. The bucket is created on first use if it doesn't exist yet.
import { Client } from "minio";
import path from "node:path";

const MINIO_BUCKET = process.env.MINIO_BUCKET || "tia-tasc";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "tia",
  secretKey: process.env.MINIO_SECRET_KEY || "tia12345",
});

let bucketReady: Promise<void> | null = null;

function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = minioClient.bucketExists(MINIO_BUCKET).then((exists) => {
      if (!exists) return minioClient.makeBucket(MINIO_BUCKET);
    });
  }
  return bucketReady;
}

/** Persist bytes under the given object key. Returns the key as stored. */
export async function saveFile(objectKey: string, data: Buffer | Uint8Array): Promise<string> {
  await ensureBucket();
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  await minioClient.putObject(MINIO_BUCKET, objectKey, buffer, buffer.length);
  return objectKey;
}

/** Read bytes for a previously stored object key. */
export async function readStoredFile(objectKey: string): Promise<Buffer> {
  await ensureBucket();
  const stream = await minioClient.getObject(MINIO_BUCKET, objectKey);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export function uploadPath(jobId: string, fileName: string): string {
  // Strip any directory components from the original file name.
  const safeName = path.basename(fileName);
  return `uploads/${jobId}/${safeName}`;
}

export function invoicePath(invoiceId: string): string {
  return `invoices/${invoiceId}.pdf`;
}
