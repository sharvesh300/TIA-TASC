import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export function createContract(data: Prisma.ContractCreateInput) {
  return prisma.contract.create({ data });
}

export function getContractById(id: string) {
  return prisma.contract.findUnique({ where: { id } });
}

export function listContractsByClient(clientId: string) {
  return prisma.contract.findMany({
    where: { clientId },
    orderBy: { validFrom: "desc" },
  });
}

/**
 * Get the active contract for a client on a given date.
 * Returns the contract with validFrom <= asOfDate and (validTo is NULL OR validTo > asOfDate) and status = "ACTIVE".
 */
export async function getActiveContract(clientId: string, asOfDate: Date) {
  return prisma.contract.findFirst({
    where: {
      clientId,
      status: "ACTIVE",
      validFrom: { lte: asOfDate },
      OR: [{ validTo: null }, { validTo: { gt: asOfDate } }],
    },
    orderBy: { validFrom: "desc" },
  });
}

/**
 * Update a contract: archive the current one and create a new one with the new data.
 * This preserves versioning and prevents overlaps.
 */
export async function updateContract(
  id: string,
  data: {
    markupPercent?: number;
    paymentTermsDays?: number;
    currency?: string;
    description?: string;
    validFrom?: Date;
  }
) {
  const current = await getContractById(id);
  if (!current) throw new Error(`Contract ${id} not found`);

  // Archive the current contract (set validTo to now, status to ARCHIVED)
  await prisma.contract.update({
    where: { id },
    data: {
      status: "ARCHIVED",
      validTo: new Date(),
    },
  });

  // Create new contract with updated data
  return prisma.contract.create({
    data: {
      clientId: current.clientId,
      billingModel: current.billingModel,
      markupPercent: data.markupPercent ?? current.markupPercent,
      paymentTermsDays: data.paymentTermsDays ?? current.paymentTermsDays,
      currency: data.currency ?? current.currency,
      description: data.description ?? current.description,
      validFrom: data.validFrom || new Date(),
      validTo: null,
      status: "ACTIVE",
    },
  });
}

/**
 * Create a new contract version for a client: archives the current active contract
 * (if any) and creates a new ACTIVE one. Handles both first-contract creation and
 * subsequent versioning through a single entry point.
 */
export async function createContractVersion(
  clientId: string,
  data: {
    markupPercent: number;
    paymentTermsDays: number;
    currency: string;
    description?: string;
    validFrom?: Date;
  }
) {
  const validFrom = data.validFrom || new Date();
  const current = await prisma.contract.findFirst({
    where: { clientId, status: "ACTIVE" },
    orderBy: { validFrom: "desc" },
  });

  if (current) {
    return updateContract(current.id, {
      markupPercent: data.markupPercent,
      paymentTermsDays: data.paymentTermsDays,
      currency: data.currency,
      description: data.description,
      validFrom,
    });
  }

  return prisma.contract.create({
    data: {
      clientId,
      billingModel: "MARKUP_PERCENT",
      markupPercent: data.markupPercent,
      paymentTermsDays: data.paymentTermsDays,
      currency: data.currency,
      description: data.description,
      validFrom,
      validTo: null,
      status: "ACTIVE",
    },
  });
}

export function deleteContract(id: string) {
  return prisma.contract.delete({ where: { id } });
}
