import { prisma } from "@/lib/prisma";

export function listClients() {
  return prisma.client.findMany({ orderBy: { name: "asc" } });
}

export function getClientById(id: string) {
  return prisma.client.findUnique({ where: { id } });
}
