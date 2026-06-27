"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-role";
import { createJobFromUpload } from "@/services/ingest.service";

export type UploadState = { error?: string; ok?: boolean };

export async function uploadTimesheetAction(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const session = await requireRole(["CLIENT"]);
  const clientId = session.user.clientId;

  if (!clientId) {
    return { error: "Your account is not linked to a client organization." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }

  try {
    await createJobFromUpload({ clientId, file });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Upload failed." };
  }

  revalidatePath("/portal");
  return { ok: true };
}
