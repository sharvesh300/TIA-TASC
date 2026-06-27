import { prisma } from "@/lib/prisma";

export function getExtractedRow(id: string) {
  return prisma.extractedRow.findUnique({ where: { id } });
}

export function listExtractedRows(jobId: string) {
  return prisma.extractedRow.findMany({ where: { jobId }, orderBy: { empId: "asc" } });
}

export function updateExtractedRow(
  id: string,
  data: {
    empId?: string | null;
    fullName?: string;
    workingDays?: number;
    otHours?: number;
    currency?: string;
    humanVerified?: boolean;
  }
) {
  return prisma.extractedRow.update({ where: { id }, data });
}
