// Ingest stage: accept an uploaded timesheet, persist the bytes, create a
// PipelineJob, and move it to QUEUED so extraction can pick it up.
import type { DocumentFormat, SourceChannel } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { saveFile, uploadPath } from "@/lib/storage";
import { createJob, updateJob } from "@/repositories/job.repo";
import { transition } from "@/services/pipeline.service";
import { advanceJob } from "@/services/orchestrator.service";

const FORMAT_BY_EXTENSION: Record<string, DocumentFormat> = {
  xlsx: "XLSX",
  xls: "XLSX",
  pdf: "PDF",
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  webp: "IMAGE",
};

export function detectFormat(fileName: string, mimeType?: string): DocumentFormat {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (FORMAT_BY_EXTENSION[ext]) return FORMAT_BY_EXTENSION[ext];
  if (mimeType?.includes("spreadsheet")) return "XLSX";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType?.startsWith("image/")) return "IMAGE";
  throw new Error(`Unsupported file type: ${fileName}`);
}

export interface IngestInput {
  clientId: string;
  file: File;
  sourceChannel?: SourceChannel;
}

/** Create a PipelineJob from an uploaded file and queue it for extraction. */
export async function createJobFromUpload({ clientId, file, sourceChannel = "PORTAL" }: IngestInput) {
  const format = detectFormat(file.name, file.type);
  const bytes = Buffer.from(await file.arrayBuffer());

  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { id: clientId },
        { code: clientId },
      ],
    },
  });

  if (!client) {
    throw new Error(`Client not found for identifier: ${clientId}`);
  }

  const job = await createJob({
    client: { connect: { id: client.id } },
    sourceChannel,
    format,
    fileUrl: "",
    originalFileName: file.name,
    mimeType: file.type || null,
    fileSize: bytes.length,
  });

  const relativePath = await saveFile(uploadPath(job.id, file.name), bytes);
  await updateJob(job.id, { fileUrl: relativePath });

  // UPLOADED → QUEUED (ready for the extraction worker / trigger).
  await transition(job.id, "QUEUED", {
    type: "INGESTED",
    actor: "SYSTEM",
    message: `Ingested ${file.name} (${format})`,
    metadata: { originalFileName: file.name, format, fileSize: bytes.length },
  });

  // Kick off the full pipeline immediately so jobs flow end-to-end on upload
  // without manual clicks. Errors are handled inside each stage (the job is
  // marked FAILED or NEEDS_REVIEW) and must not fail the upload itself, which
  // already succeeded.
  try {
    await advanceJob(job.id);
  } catch {
    // swallow — job status already reflects the failure
  }

  return job;
}
