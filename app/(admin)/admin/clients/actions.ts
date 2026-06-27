"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-role";
import { createClient, updateClient } from "@/repositories/client.repo";

export type ClientFormState = { error?: string };

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
