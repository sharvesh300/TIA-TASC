import Link from "next/link";
import { AlertCircle, Inbox as InboxIcon, FileWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/components/pipeline/job-status-badge";
import { requireRole } from "@/lib/require-role";
import { listFinOpsInboxJobs } from "@/repositories/inbox.repo";
import { SyncInboxButton } from "./sync-inbox-button";

export default async function FinOpsInboxPage() {
  await requireRole(["FINOPS", "ADMIN"]);
  const jobs = await listFinOpsInboxJobs();

  const needsReview = jobs.filter((j) => j.status === "NEEDS_REVIEW");
  const failed = jobs.filter((j) => j.status === "FAILED");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
            Inbox
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Everything that needs a human right now. The pipeline runs itself otherwise —
            jobs only land here when extraction is uncertain, an employee can&apos;t be matched,
            a validation rule blocks invoicing, or processing failed outright.
          </p>
        </div>
        <SyncInboxButton />
      </div>

      {jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
              <InboxIcon className="size-6" />
            </div>
            <p className="font-medium">Inbox zero</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Nothing needs your attention. Every uploaded timesheet is flowing through the
              pipeline automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {needsReview.map((job) => (
            <InboxRow key={job.id} job={job} kind="review" />
          ))}
          {failed.map((job) => (
            <InboxRow key={job.id} job={job} kind="failed" />
          ))}
        </div>
      )}
    </div>
  );
}

type InboxJob = Awaited<ReturnType<typeof listFinOpsInboxJobs>>[number];

function InboxRow({ job, kind }: { job: InboxJob; kind: "review" | "failed" }) {
  const lastEvent = job.events[0];
  return (
    <Card
      className={
        kind === "failed"
          ? "border-rose-500/30 hover:border-rose-500/50 transition-colors"
          : "border-amber-500/30 hover:border-amber-500/50 transition-colors"
      }
    >
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={
              kind === "failed"
                ? "rounded-lg bg-rose-500/10 p-2 text-rose-500 shrink-0"
                : "rounded-lg bg-amber-500/10 p-2 text-amber-500 shrink-0"
            }
          >
            {kind === "failed" ? <FileWarning className="size-4" /> : <AlertCircle className="size-4" />}
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{job.client.name}</span>
              <JobStatusBadge status={job.status} />
              <Badge variant="outline" className="font-mono text-[10px]">
                {job.format}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
              {job.originalFileName ?? "—"} · {job._count.extractedRows} row(s)
            </p>
            {lastEvent?.message && (
              <p className="text-sm text-foreground/80">{lastEvent.message}</p>
            )}
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/finops/${job.id}`}>Resolve</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
