import { prisma } from "@/lib/prisma";
import type {
  EventActor,
  JobStatus,
  PipelineEventType,
  Prisma,
} from "@/lib/generated/prisma/client";

export function recordEvent(data: {
  jobId: string;
  type: PipelineEventType;
  fromStatus?: JobStatus | null;
  toStatus?: JobStatus | null;
  actor?: EventActor;
  actorId?: string | null;
  message?: string | null;
  confidence?: number | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.pipelineEvent.create({
    data: {
      jobId: data.jobId,
      type: data.type,
      fromStatus: data.fromStatus ?? null,
      toStatus: data.toStatus ?? null,
      actor: data.actor ?? "SYSTEM",
      actorId: data.actorId ?? null,
      message: data.message ?? null,
      confidence: data.confidence ?? null,
      ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    },
  });
}

export function listEventsByJob(jobId: string) {
  return prisma.pipelineEvent.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" },
  });
}

/** Most recent pipeline events across jobs — feeds dashboard "recent activity" panels. */
export function listRecentEvents(take = 8, clientId?: string) {
  return prisma.pipelineEvent.findMany({
    where: clientId ? { job: { clientId } } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    include: { job: { select: { client: { select: { name: true } }, originalFileName: true } } },
  });
}
