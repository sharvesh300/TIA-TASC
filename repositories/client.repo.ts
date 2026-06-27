import { prisma } from "@/lib/prisma";
import type { ClientStatus } from "@/lib/generated/prisma/client";

export function listClients() {
  return prisma.client.findMany({ orderBy: { name: "asc" } });
}

export function countClients() {
  return prisma.client.count();
}

export function countActiveClients() {
  return prisma.client.count({ where: { status: "ACTIVE" } });
}

export function getClientById(id: string) {
  return prisma.client.findUnique({ where: { id } });
}

export function createClient(data: Parameters<typeof prisma.client.create>[0]["data"]) {
  return prisma.client.create({ data });
}

export function updateClient(
  id: string,
  data: Parameters<typeof prisma.client.update>[0]["data"]
) {
  return prisma.client.update({ where: { id }, data });
}

type ListClientsFilteredArgs = {
  q?: string;
  status?: ClientStatus;
  sort?: "name" | "code" | "createdAt";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function listClientsFiltered({
  q,
  status,
  sort = "name",
  dir = "asc",
  page = 1,
  pageSize = 10,
}: ListClientsFilteredArgs) {
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);

  return { rows, total };
}
