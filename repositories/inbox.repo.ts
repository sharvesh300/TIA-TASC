// Inbox queries: role-aware "what needs me now" lists. Kept separate from
// job.repo/invoice.repo since these are cross-cutting views built for the
// inbox UI specifically (counts + lightweight lists), not the canonical CRUD.
import { prisma } from "@/lib/prisma";
import type { JobStatus, InvoiceStatus } from "@/lib/generated/prisma/client";

const FINOPS_JOB_STATUSES: JobStatus[] = ["NEEDS_REVIEW", "FAILED"];
const REVIEWER_INVOICE_STATUSES: InvoiceStatus[] = ["VALIDATED"];

export function listFinOpsInboxJobs(clientId?: string) {
  return prisma.pipelineJob.findMany({
    where: {
      status: { in: FINOPS_JOB_STATUSES },
      clientId: clientId ?? undefined,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      client: true,
      _count: { select: { extractedRows: true } },
      events: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export function countFinOpsInboxJobs(clientId?: string) {
  return prisma.pipelineJob.count({
    where: {
      status: { in: FINOPS_JOB_STATUSES },
      ...(clientId ? { clientId } : {}),
    },
  });
}

export function listReviewerInboxInvoices() {
  return prisma.invoice.findMany({
    where: { status: { in: REVIEWER_INVOICE_STATUSES } },
    orderBy: { updatedAt: "desc" },
    include: { client: true, _count: { select: { lines: true } } },
  });
}

export function countReviewerInboxInvoices() {
  return prisma.invoice.count({ where: { status: { in: REVIEWER_INVOICE_STATUSES } } });
}

export function listClientInboxJobs(clientId: string) {
  return prisma.pipelineJob.findMany({
    where: { clientId, status: { in: FINOPS_JOB_STATUSES } },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { extractedRows: true } } },
  });
}

export function countClientInboxJobs(clientId: string) {
  return prisma.pipelineJob.count({ where: { clientId, status: { in: FINOPS_JOB_STATUSES } } });
}
