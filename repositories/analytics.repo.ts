// Aggregation queries that back the per-role analytics dashboards. Kept
// separate from the canonical CRUD repos since these are read-only rollups
// shaped for charts, not entity lookups.
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(dayKey(new Date(now.getTime() - i * DAY_MS)));
  }
  return out;
}

/** Job counts bucketed by status — used for a status breakdown bar/pie. */
export async function jobStatusBreakdown(clientId?: string) {
  const rows = await prisma.pipelineJob.groupBy({
    by: ["status"],
    where: clientId ? { clientId } : undefined,
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

/** Daily job ingestion volume over the last N days. */
export async function jobVolumeByDay(days = 14, clientId?: string) {
  const since = new Date(Date.now() - days * DAY_MS);
  const jobs = await prisma.pipelineJob.findMany({
    where: { createdAt: { gte: since }, ...(clientId ? { clientId } : {}) },
    select: { createdAt: true },
  });
  const buckets = new Map(lastNDays(days).map((d) => [d, 0]));
  for (const j of jobs) {
    const k = dayKey(j.createdAt);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

/** Invoice totals (billed amount) bucketed by pay period, oldest first. */
export async function invoiceTotalsByPeriod(clientId?: string, take = 12) {
  const invoices = await prisma.invoice.findMany({
    where: clientId ? { clientId } : undefined,
    select: { payPeriod: true, totalAmount: true, status: true },
  });
  const byPeriod = new Map<string, number>();
  for (const inv of invoices) {
    byPeriod.set(inv.payPeriod, (byPeriod.get(inv.payPeriod) ?? 0) + Number(inv.totalAmount));
  }
  return Array.from(byPeriod.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-take)
    .map(([payPeriod, total]) => ({ payPeriod, total }));
}

/** Invoice counts bucketed by status. */
export async function invoiceStatusBreakdown(clientId?: string) {
  const rows = await prisma.invoice.groupBy({
    by: ["status"],
    where: clientId ? { clientId } : undefined,
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

/** Extraction engine usage split (Excel / Tesseract / GPT-4o / none). */
export async function engineUsageBreakdown(clientId?: string) {
  const rows = await prisma.pipelineJob.groupBy({
    by: ["engineUsed"],
    where: clientId ? { clientId } : undefined,
    _count: { _all: true },
  });
  return rows.map((r) => ({ engine: r.engineUsed, count: r._count._all }));
}

/** Average extraction confidence across all extracted rows, 0-1. */
export async function averageConfidence(clientId?: string) {
  const result = await prisma.extractedRow.aggregate({
    where: clientId ? { clientId } : undefined,
    _avg: { overallConfidence: true },
  });
  return result._avg.overallConfidence ? Number(result._avg.overallConfidence) : null;
}

/** Validation rule pass/warning/blocker counts — reviewer quality signal. */
export async function validationOutcomeBreakdown() {
  const rows = await prisma.validationResult.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

/** Top clients by job volume — admin/finops "where's the work" view. */
export async function topClientsByVolume(take = 6) {
  const rows = await prisma.pipelineJob.groupBy({
    by: ["clientId"],
    _count: { _all: true },
    orderBy: { _count: { clientId: "desc" } },
    take,
  });
  const clients = await prisma.client.findMany({
    where: { id: { in: rows.map((r) => r.clientId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    clientId: r.clientId,
    name: nameById.get(r.clientId) ?? "Unknown",
    count: r._count._all,
  }));
}

/** Average time-to-dispatch in hours, over dispatched jobs (throughput signal). */
export async function averageTurnaroundHours(clientId?: string) {
  const jobs = await prisma.pipelineJob.findMany({
    where: { status: "DISPATCHED", ...(clientId ? { clientId } : {}) },
    select: { createdAt: true, updatedAt: true },
  });
  if (jobs.length === 0) return null;
  const totalMs = jobs.reduce((sum, j) => sum + (j.updatedAt.getTime() - j.createdAt.getTime()), 0);
  return totalMs / jobs.length / (60 * 60 * 1000);
}
