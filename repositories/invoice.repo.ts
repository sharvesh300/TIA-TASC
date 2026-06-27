import { prisma } from "@/lib/prisma";
import type { InvoiceStatus, Prisma } from "@/lib/generated/prisma/client";

export function createInvoice(data: Parameters<typeof prisma.invoice.create>[0]["data"]) {
  return prisma.invoice.create({ data });
}

export function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { lines: true, validations: true, client: true },
  });
}

export function getInvoiceByClientPeriod(clientId: string, payPeriod: string) {
  return prisma.invoice.findUnique({ where: { clientId_payPeriod: { clientId, payPeriod } } });
}

export function listInvoicesByClient(clientId: string) {
  return prisma.invoice.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
}

export function listInvoicesByStatus(statuses: InvoiceStatus[]) {
  return prisma.invoice.findMany({
    where: { status: { in: statuses } },
    orderBy: { createdAt: "desc" },
    include: { client: true, _count: { select: { lines: true } } },
  });
}

export function updateInvoice(id: string, data: Prisma.InvoiceUpdateInput) {
  return prisma.invoice.update({ where: { id }, data });
}

export function listAllInvoices() {
  return prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: true, _count: { select: { lines: true } } },
  });
}

export function listInvoicesByClientWithDetails(clientId: string) {
  return prisma.invoice.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { client: true, _count: { select: { lines: true } } },
  });
}

