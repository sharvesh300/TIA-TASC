import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/pipeline/job-status-badge";
import { requireRole } from "@/lib/require-role";
import { listJobsByClient } from "@/repositories/job.repo";
import { listClientInboxJobs } from "@/repositories/inbox.repo";
import { UploadForm } from "./upload-form";
import { AlertTriangle } from "lucide-react";

export default async function ClientPortalPage() {
  const session = await requireRole(["CLIENT", "ADMIN"]);
  const clientId = session.user.clientId;

  if (!clientId) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold">Portal</h1>
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a client organization, so there are no timesheets to show.
        </p>
      </div>
    );
  }

  const jobs = await listJobsByClient(clientId);
  const attentionJobs = await listClientInboxJobs(clientId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 bg-clip-text text-transparent dark:from-teal-400 dark:via-emerald-400 dark:to-green-400">
          Upload Portal
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Upload timesheets and track invoice extraction, validation, and approval status in real time.
        </p>
      </div>

      {attentionJobs.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500 shrink-0">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {attentionJobs.length} timesheet{attentionJobs.length > 1 ? "s" : ""} need
                {attentionJobs.length > 1 ? "" : "s"} attention
              </p>
              <p className="text-xs text-muted-foreground">
                Our team flagged {attentionJobs.length === 1 ? "it" : "them"} for review — no action
                needed from you, but processing is paused. Check the status column below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card className="h-full border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Submit Timesheet</CardTitle>
              <CardDescription>Upload a new timesheet document to trigger automated extraction and invoice generation.</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadForm />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 pb-4 border-b">
              <h2 className="font-heading text-lg font-semibold">Upload History &amp; Pipeline Status</h2>
              <p className="text-xs text-muted-foreground">View details of your uploaded timesheets and their corresponding invoice status.</p>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">File</TableHead>
                      <TableHead className="font-semibold">Format</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Invoice</TableHead>
                      <TableHead className="font-semibold">Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                          No timesheets uploaded yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {jobs.map((job) => {
                      const invoice = job.invoices[0];
                      return (
                        <TableRow key={job.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium font-mono text-xs max-w-[200px] truncate">
                            {job.originalFileName ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">{job.format}</TableCell>
                          <TableCell>
                            <JobStatusBadge status={job.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {invoice ? `${invoice.currency} ${Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} · ${invoice.status}` : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {job.createdAt.toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
