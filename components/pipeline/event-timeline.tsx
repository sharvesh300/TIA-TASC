import type { PipelineEvent } from "@/lib/generated/prisma/client";

// Renders the PipelineEvent log for a job — the human-readable trail of every
// state transition, who/what triggered it, and confidence.
export function EventTimeline({ events }: { events: PipelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3 text-sm">
          <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{event.type.replaceAll("_", " ")}</span>
              <span className="text-xs text-muted-foreground">
                {event.actor}
                {event.confidence != null ? ` · conf ${Number(event.confidence).toFixed(2)}` : ""}
              </span>
            </div>
            {event.message && <p className="text-muted-foreground">{event.message}</p>}
            <p className="text-xs text-muted-foreground">
              {event.createdAt.toLocaleString()}
              {event.fromStatus && event.toStatus
                ? ` · ${event.fromStatus} → ${event.toStatus}`
                : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
