// Human-in-the-loop review. A FinOps user corrects low-confidence extracted rows
// and approves them; the job then advances NEEDS_REVIEW → EXTRACTED. This is the
// review surface a chatbot would later assist with.
import { getJobById } from "@/repositories/job.repo";
import { updateExtractedRow } from "@/repositories/extracted-row.repo";
import { transition } from "@/services/pipeline.service";
import { advanceJob } from "@/services/orchestrator.service";

export interface RowEdit {
  rowId: string;
  empId?: string | null;
  fullName?: string;
  workingDays?: number;
  otHours?: number;
}

export async function resolveReview(jobId: string, edits: RowEdit[], userId?: string | null) {
  const job = await getJobById(jobId);
  if (!job) throw new Error(`PipelineJob ${jobId} not found`);
  if (job.status !== "NEEDS_REVIEW") {
    throw new Error(`Job ${jobId} is not awaiting review (status: ${job.status})`);
  }

  for (const edit of edits) {
    await updateExtractedRow(edit.rowId, {
      empId: edit.empId,
      fullName: edit.fullName,
      workingDays: edit.workingDays,
      otHours: edit.otHours,
      humanVerified: true,
    });
  }

  await transition(jobId, "EXTRACTED", {
    type: "REVIEW_RESOLVED",
    actor: "USER",
    actorId: userId,
    message: `Reviewer corrected and approved ${edits.length} row(s)`,
    metadata: { rowCount: edits.length },
  });

  // Resume the automated pipeline now that the blocking issue is fixed.
  await advanceJob(jobId, userId);

  return { rowCount: edits.length };
}
