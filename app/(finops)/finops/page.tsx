import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/pipeline/job-status-badge";
import { requireRole } from "@/lib/require-role";
import { listAllJobs } from "@/repositories/job.repo";
import { FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

export default async function FinOpsPage() {
  await requireRole(["FINOPS", "ADMIN"]);
  const jobs = await listAllJobs();

  const totalJobs = jobs.length;
  const needsReview = jobs.filter((j) => j.status === "NEEDS_REVIEW").length;
  const processed = jobs.filter((j) => j.status === "DISPATCHED" || j.status === "READY_FOR_DISPATCH" || j.status === "EXTRACTED").length;
  const failed = jobs.filter((j) => j.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
          Financial Operations Pipeline
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Overview of all incoming client timesheets. Process, validate, and dispatch invoices on demand.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-300 hover:border-violet-500/50 group/card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Uploads</CardTitle>
              <CardDescription>Processed timesheets</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500 group-hover/card:bg-violet-500 group-hover/card:text-white transition-all duration-300">
              <FileSpreadsheet className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading">{totalJobs}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300 hover:border-amber-500/50 group/card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Needs Review</CardTitle>
              <CardDescription>Requires validation</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover/card:bg-amber-500 group-hover/card:text-white transition-all duration-300">
              <AlertCircle className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading text-amber-500">{needsReview}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300 hover:border-emerald-500/50 group/card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Ready / Sent</CardTitle>
              <CardDescription>Successfully invoiced</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover/card:bg-emerald-500 group-hover/card:text-white transition-all duration-300">
              <CheckCircle2 className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading text-emerald-500">{processed}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300 hover:border-rose-500/50 group/card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Extraction Failures</CardTitle>
              <CardDescription>Error status</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 group-hover/card:bg-rose-500 group-hover/card:text-white transition-all duration-300">
              <AlertTriangle className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading text-rose-500">{failed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-6 pb-0 flex flex-col gap-1">
          <h2 className="font-heading text-xl font-semibold">Timesheet Ingestion Pipeline</h2>
          <p className="text-sm text-muted-foreground">Open a timesheet job to view extraction logs, confidence scores, and generate invoices.</p>
        </div>
        <div className="p-6">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold">File</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Engine</TableHead>
                  <TableHead className="font-semibold">Rows</TableHead>
                  <TableHead className="font-semibold">Uploaded</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      No jobs in the pipeline yet.
                    </TableCell>
                  </TableRow>
                )}
                {jobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{job.client.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{job.originalFileName ?? "—"}</TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{job.engineUsed}</TableCell>
                    <TableCell className="text-muted-foreground">{job._count.extractedRows}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {job.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/finops/${job.id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors">
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
