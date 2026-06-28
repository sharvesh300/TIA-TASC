"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-role";
import { resolveReview, type RowEdit } from "@/services/review.service";
import { runExtraction } from "@/services/extraction.service";
import { generateInvoice } from "@/services/invoice.service";
import { runValidations } from "@/services/validation.service";
import { rejectInvoice } from "@/services/dispatch.service";

export async function resolveReviewAction(jobId: string, edits: RowEdit[]) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  await resolveReview(jobId, edits, session.user.id);
  revalidatePath(`/finops/${jobId}`);
  revalidatePath("/finops");
  revalidatePath("/finops/inbox");
}

/** Retry the pipeline from NEEDS_REVIEW with no row edits — for issues fixed
 * elsewhere (e.g. a contract was just assigned in Admin), not in the row data. */
export async function resumeJobAction(jobId: string) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  await resolveReview(jobId, [], session.user.id);
  revalidatePath(`/finops/${jobId}`);
  revalidatePath("/finops");
  revalidatePath("/finops/inbox");
}

export async function rerunExtractionAction(jobId: string) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  await runExtraction(jobId, session.user.id);
  revalidatePath(`/finops/${jobId}`);
  revalidatePath("/finops");
}

export async function generateInvoiceAction(jobId: string) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  await generateInvoice(jobId, session.user.id);
  revalidatePath(`/finops/${jobId}`);
  revalidatePath("/finops");
}

export async function validateInvoiceAction(jobId: string, invoiceId: string) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  await runValidations(invoiceId, session.user.id);
  revalidatePath(`/finops/${jobId}`);
  revalidatePath("/finops");
}

export async function rejectInvoiceAction(jobId: string, invoiceId: string, note: string) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  await rejectInvoice(invoiceId, note, session.user.id);
  revalidatePath(`/finops/${jobId}`);
  revalidatePath("/finops");
  revalidatePath("/finops/inbox");
}
