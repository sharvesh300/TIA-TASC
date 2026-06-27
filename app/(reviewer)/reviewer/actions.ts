"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-role";
import { approveAndDispatch, rejectInvoice } from "@/services/dispatch.service";

export async function approveInvoiceAction(invoiceId: string) {
  const session = await requireRole(["REVIEWER", "ADMIN"]);
  await approveAndDispatch(invoiceId, session.user.id);
  revalidatePath("/reviewer");
}

export async function rejectInvoiceAction(invoiceId: string, note: string) {
  const session = await requireRole(["REVIEWER", "ADMIN"]);
  await rejectInvoice(invoiceId, note || "No reason provided", session.user.id);
  revalidatePath("/reviewer");
}
