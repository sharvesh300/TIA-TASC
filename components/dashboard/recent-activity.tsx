import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PipelineEvent } from "@/lib/generated/prisma/client";

type ActivityEvent = PipelineEvent & {
  job: { client: { name: string }; originalFileName: string | null } | null;
};

const ACTOR_DOT: Record<string, string> = {
  SYSTEM: "bg-slate-400",
  AI: "bg-violet-500",
  USER: "bg-emerald-500",
};

export function RecentActivity({
  title = "Recent activity",
  description = "Latest pipeline events across clients",
  events,
}: {
  title?: string;
  description?: string;
  events: ActivityEvent[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <div className={`mt-1.5 size-2 shrink-0 rounded-full ${ACTOR_DOT[event.actor] ?? "bg-slate-400"}`} />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{event.type.replaceAll("_", " ")}</span>
                    {event.job && (
                      <span className="text-xs text-muted-foreground truncate">
                        · {event.job.client.name}
                      </span>
                    )}
                  </div>
                  {event.message && (
                    <p className="text-muted-foreground text-xs line-clamp-2">{event.message}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/80">
                    {event.createdAt.toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
