import { prisma } from "@/lib/prisma";

export function createInvoice(data: Parameters<typeof prisma.invoice.create>[0]["data"]) {
  return prisma.invoice.create({ data });
}

export function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { lines: true, validations: true },
  });
}

export function listInvoicesByClient(clientId: string) {
  return prisma.invoice.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
}
