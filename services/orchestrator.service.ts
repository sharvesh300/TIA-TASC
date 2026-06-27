// Orchestrator: drives a job through extraction → invoice generation → validation
// automatically, stopping at the first state that needs a human (NEEDS_REVIEW)
// or that has reached a natural resting point (READY_FOR_DISPATCH / FAILED).
// Every individual stage already updates its own status via pipeline.service —
// this just chains the stages so callers don't have to remember the sequence.
import { getJobById, getJobWithRelations } from "@/repositories/job.repo";
import { runExtraction } from "@/services/extraction.service";
import { generateInvoice } from "@/services/invoice.service";
import { runValidations } from "@/services/validation.service";

export interface AdvanceResult {
  jobId: string;
  finalStatus: string;
  stoppedReason: "NEEDS_REVIEW" | "READY_FOR_DISPATCH" | "DISPATCHED" | "FAILED" | "NO_ROWS";
}

/**
 * Advance a job as far as it can go without human input. Safe to call
 * repeatedly — each stage no-ops or throws if its preconditions aren't met,
 * and we catch those to stop cleanly rather than propagate.
 */
export async function advanceJob(jobId: string, actorId?: string | null): Promise<AdvanceResult> {
  let job = await getJobById(jobId);
  if (!job) throw new Error(`PipelineJob ${jobId} not found`);

  // EXTRACTING / QUEUED / UPLOADED → run extraction if not already done.
  if (["UPLOADED", "QUEUED", "EXTRACTING"].includes(job.status)) {
    await runExtraction(jobId, actorId);
    job = await getJobById(jobId);
  }

  if (!job) throw new Error(`PipelineJob ${jobId} not found`);

  if (job.status === "NEEDS_REVIEW" || job.status === "FAILED") {
    return { jobId, finalStatus: job.status, stoppedReason: job.status };
  }

  // EXTRACTED → generate invoice. generateInvoice itself bounces to
  // NEEDS_REVIEW (and throws) on unresolved employees / missing contract.
  if (job.status === "EXTRACTED") {
    try {
      await generateInvoice(jobId, actorId);
    } catch {
      job = await getJobById(jobId);
      return { jobId, finalStatus: job?.status ?? "FAILED", stoppedReason: "NEEDS_REVIEW" };
    }
    job = await getJobById(jobId);
  }

  if (!job) throw new Error(`PipelineJob ${jobId} not found`);

  // VALIDATING → run validations. A blocker bounces to NEEDS_REVIEW.
  if (job.status === "VALIDATING") {
    const withInvoice = await getJobWithRelations(jobId);
    const invoice = withInvoice?.invoices.find((inv) => inv.status === "DRAFT") ?? withInvoice?.invoices[0];
    if (invoice) {
      await runValidations(invoice.id, actorId);
    }
    job = await getJobById(jobId);
  }

  if (!job) throw new Error(`PipelineJob ${jobId} not found`);

  return {
    jobId,
    finalStatus: job.status,
    stoppedReason:
      job.status === "READY_FOR_DISPATCH"
        ? "READY_FOR_DISPATCH"
        : job.status === "DISPATCHED"
        ? "DISPATCHED"
        : job.status === "FAILED"
        ? "FAILED"
        : "NEEDS_REVIEW",
  };
}
