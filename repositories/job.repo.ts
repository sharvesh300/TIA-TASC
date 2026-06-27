import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export function createJob(data: Parameters<typeof prisma.pipelineJob.create>[0]["data"]) {
  return prisma.pipelineJob.create({ data });
}

export function getJobById(id: string) {
  return prisma.pipelineJob.findUnique({ where: { id }, include: { extractedRows: true } });
}

export function getJobWithRelations(id: string) {
  return prisma.pipelineJob.findUnique({
    where: { id },
    include: {
      extractedRows: true,
      client: true,
      events: { orderBy: { createdAt: "asc" } },
      invoices: { include: { lines: true, validations: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

export function listJobsByClient(clientId: string) {
  return prisma.pipelineJob.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { invoices: true },
  });
}

export function listAllJobs() {
  return prisma.pipelineJob.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: true, invoices: true, _count: { select: { extractedRows: true } } },
  });
}

export function updateJob(id: string, data: Prisma.PipelineJobUpdateInput) {
  return prisma.pipelineJob.update({ where: { id }, data });
}

export function replaceExtractedRows(
  jobId: string,
  clientId: string,
  rows: Prisma.ExtractedRowCreateManyInput[]
) {
  return prisma.$transaction([
    prisma.extractedRow.deleteMany({ where: { jobId } }),
    prisma.extractedRow.createMany({ data: rows.map((r) => ({ ...r, jobId, clientId })) }),
  ]);
}
