// Pipeline state machine. This is the single entry point through which every
// job status transition flows: it validates the edge, updates PipelineJob.status,
// and records a PipelineEvent. A future chatbot drives the pipeline by calling
// transition()/advance() and reading the event log, rather than poking the DB.
import type {
  EventActor,
  JobStatus,
  PipelineEventType,
  Prisma,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/repositories/event.repo";

/** Allowed forward edges in the job lifecycle. */
export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  UPLOADED: ["QUEUED", "FAILED"],
  QUEUED: ["EXTRACTING", "FAILED"],
  EXTRACTING: ["NEEDS_REVIEW", "EXTRACTED", "FAILED"],
  NEEDS_REVIEW: ["EXTRACTED", "FAILED"],
  EXTRACTED: ["GENERATING_INVOICE", "FAILED"],
  GENERATING_INVOICE: ["VALIDATING", "FAILED"],
  VALIDATING: ["READY_FOR_DISPATCH", "NEEDS_REVIEW", "FAILED"],
  READY_FOR_DISPATCH: ["DISPATCHED", "FAILED"],
  DISPATCHED: [],
  FAILED: ["QUEUED"], // allow re-queue/retry after a failure
};

export class InvalidTransitionError extends Error {
  constructor(from: JobStatus, to: JobStatus) {
    super(`Invalid pipeline transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface TransitionOptions {
  type: PipelineEventType;
  actor?: EventActor;
  actorId?: string | null;
  message?: string | null;
  confidence?: number | null;
  metadata?: Prisma.InputJsonValue;
  /** Extra PipelineJob columns to update alongside the status (e.g. engineUsed). */
  jobData?: Prisma.PipelineJobUpdateInput;
}

/**
 * Transition a job to a new status, recording an event. Throws
 * InvalidTransitionError if the edge is not permitted by the state machine.
 */
export async function transition(jobId: string, to: JobStatus, opts: TransitionOptions) {
  const job = await prisma.pipelineJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`PipelineJob ${jobId} not found`);

  const from = job.status;
  if (from === to) {
    // No-op status, but still log the event for traceability.
  } else if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }

  const updated = await prisma.pipelineJob.update({
    where: { id: jobId },
    data: { status: to, ...(opts.jobData ?? {}) },
  });

  await recordEvent({
    jobId,
    type: opts.type,
    fromStatus: from,
    toStatus: to,
    actor: opts.actor ?? "SYSTEM",
    actorId: opts.actorId ?? null,
    message: opts.message ?? null,
    confidence: opts.confidence ?? null,
    metadata: opts.metadata,
  });

  return updated;
}

/** Mark a job FAILED with a reason, from any non-terminal status. */
export async function fail(jobId: string, reason: string, actorId?: string | null) {
  return transition(jobId, "FAILED", {
    type: "FAILED",
    actor: "SYSTEM",
    actorId,
    message: reason,
    jobData: { failureReason: reason },
  });
}
