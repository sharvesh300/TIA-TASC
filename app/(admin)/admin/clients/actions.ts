"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/lib/generated/prisma/client";
import { requireRole } from "@/lib/require-role";
import { createClient, updateClient } from "@/repositories/client.repo";
import { createContractVersion } from "@/repositories/contract.repo";
import {
  assignEmployeeToClient,
  unassignEmployeeFromClient,
  assignEmployeeToContract,
  unassignEmployeeFromContract,
} from "@/repositories/employee.repo";
import { DEFAULT_CONTRACT_WORK_RULES, type ContractWorkRulesConfig } from "@/lib/constants";

export type ClientFormState = { error?: string };
export type ContractFormState = { error?: string };
export type AssignFormState = { error?: string };

function randomCode() {
  return `C-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  await requireRole(["ADMIN"]);

  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || randomCode();
  const city = (formData.get("city") as string) || null;
  const industry = (formData.get("industry") as string) || null;
  const contactEmail = (formData.get("contactEmail") as string) || null;

  if (!name?.trim()) {
    return { error: "Name is required." };
  }

  try {
    await createClient({ name, code, city, industry, contactEmail });
  } catch {
    return { error: "Could not create client. The code may already be in use." };
  }

  revalidatePath("/admin/clients");
  return {};
}

export async function updateClientAction(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  await requireRole(["ADMIN"]);

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const city = (formData.get("city") as string) || null;
  const industry = (formData.get("industry") as string) || null;
  const contactEmail = (formData.get("contactEmail") as string) || null;

  if (!id || !name?.trim() || !code?.trim()) {
    return { error: "Name and code are required." };
  }

  try {
    await updateClient(id, { name, code, city, industry, contactEmail });
  } catch {
    return { error: "Could not update client. The code may already be in use." };
  }

  revalidatePath("/admin/clients");
  return {};
}

export async function toggleClientStatusAction(id: string, currentStatus: "ACTIVE" | "INACTIVE") {
  await requireRole(["ADMIN"]);
  await updateClient(id, { status: currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
  revalidatePath("/admin/clients");
}

export async function createContractVersionAction(
  _prevState: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  await requireRole(["ADMIN"]);

  const clientId = formData.get("clientId") as string;
  const markupPercent = Number(formData.get("markupPercent"));
  const paymentTermsDays = Number(formData.get("paymentTermsDays"));
  const currency = (formData.get("currency") as string) || "AED";
  const description = (formData.get("description") as string) || undefined;
  const validFromRaw = formData.get("validFrom") as string;
  const validFrom = validFromRaw ? new Date(validFromRaw) : undefined;
  const billingPeriodTypeRaw = formData.get("billingPeriodType") as string;
  const billingPeriodType = (["MONTHLY", "WEEKLY", "BIWEEKLY", "DAILY"] as const).includes(
    billingPeriodTypeRaw as never
  )
    ? (billingPeriodTypeRaw as "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "DAILY")
    : "MONTHLY";

  if (!clientId || Number.isNaN(markupPercent) || markupPercent < 0) {
    return { error: "A valid markup percentage is required." };
  }
  if (Number.isNaN(paymentTermsDays) || paymentTermsDays < 0) {
    return { error: "A valid payment terms (days) is required." };
  }

  const numField = (name: string, fallback: number) => {
    const raw = formData.get(name);
    if (raw === null || raw === "") return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  const workRules: ContractWorkRulesConfig = {
    standardHoursPerShift: numField("standardHoursPerShift", DEFAULT_CONTRACT_WORK_RULES.standardHoursPerShift!),
    standardHoursPerWeek: numField("standardHoursPerWeek", DEFAULT_CONTRACT_WORK_RULES.standardHoursPerWeek!),
    breakDeductionMinutes: numField("breakDeductionMinutes", DEFAULT_CONTRACT_WORK_RULES.breakDeductionMinutes!),
    shiftAllowance: numField("shiftAllowance", DEFAULT_CONTRACT_WORK_RULES.shiftAllowance!),
    overtimeAllowed: formData.get("overtimeAllowed") === "on",
    overtimeMultiplier: numField("overtimeMultiplier", DEFAULT_CONTRACT_WORK_RULES.overtimeMultiplier!),
    maxOvertimeHoursPerDay: numField("maxOvertimeHoursPerDay", DEFAULT_CONTRACT_WORK_RULES.maxOvertimeHoursPerDay!),
    maxOvertimeHoursPerWeek: numField("maxOvertimeHoursPerWeek", DEFAULT_CONTRACT_WORK_RULES.maxOvertimeHoursPerWeek!),
    validation: DEFAULT_CONTRACT_WORK_RULES.validation,
  };

  try {
    await createContractVersion(clientId, {
      markupPercent,
      paymentTermsDays,
      currency,
      description,
      validFrom,
      workRules: workRules as unknown as Prisma.InputJsonValue,
      billingPeriodType,
    });
  } catch {
    return { error: "Could not create contract version." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return {};
}

export async function assignEmployeeAction(clientId: string, employeeId: string) {
  await requireRole(["ADMIN"]);
  try {
    await assignEmployeeToClient(employeeId, clientId);
  } catch {
    return { error: "Could not assign employee. The employee ID may already be in use for this client." };
  }
  revalidatePath(`/admin/clients/${clientId}`);
  return {};
}

export async function unassignEmployeeAction(employeeId: string, clientId: string) {
  await requireRole(["ADMIN"]);
  await unassignEmployeeFromClient(employeeId);
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function assignEmployeeContractAction(
  employeeId: string,
  clientId: string,
  contractId: string | null
) {
  await requireRole(["ADMIN"]);
  if (contractId) {
    await assignEmployeeToContract(employeeId, contractId);
  } else {
    await unassignEmployeeFromContract(employeeId);
  }
  revalidatePath(`/admin/clients/${clientId}`);
}
