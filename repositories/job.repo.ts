import { prisma } from "@/lib/prisma";
import type { JobStatus } from "@/lib/generated/prisma/client";

export function createJob(data: Parameters<typeof prisma.pipelineJob.create>[0]["data"]) {
  return prisma.pipelineJob.create({ data });
}

export function getJobById(id: string) {
  return prisma.pipelineJob.findUnique({ where: { id }, include: { extractedRows: true } });
}

export function listJobsByClient(clientId: string) {
  return prisma.pipelineJob.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
}

export function updateJobStatus(id: string, status: JobStatus) {
  return prisma.pipelineJob.update({ where: { id }, data: { status } });
}
