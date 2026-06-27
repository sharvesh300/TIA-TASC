import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobStatusBadge } from "@/components/pipeline/job-status-badge";
import { EventTimeline } from "@/components/pipeline/event-timeline";
import { requireRole } from "@/lib/require-role";
import { getJobWithRelations } from "@/repositories/job.repo";
import { ReviewEditor } from "../review-editor";
import { JobActions } from "../job-actions";

export default async function FinOpsJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  await requireRole(["FINOPS", "ADMIN"]);
  const { jobId } = await params;
  const job = await getJobWithRelations(jobId);
  if (!job) notFound();

  const rows = job.extractedRows;
  const invoice = job.invoices[0];

  const validationVariant = (status: string) =>
    status === "PASS" ? "outline" : status === "WARNING" ? "secondary" : "destructive";

  return (
    <div className="space-y-4">
      <Link
        href="/finops"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to pipeline
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{job.client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {job.originalFileName ?? job.format} · engine {job.engineUsed}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <JobStatusBadge status={job.status} />
        </div>
      </div>

      {job.failureReason && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {job.failureReason}
        </p>
      )}

      <JobActions jobId={job.id} status={job.status} invoiceId={invoice?.id} />

      <Card>
        <CardHeader>
          <CardTitle>
            {job.status === "NEEDS_REVIEW" ? "Review extracted rows" : "Extracted rows"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows extracted.</p>
          ) : job.status === "NEEDS_REVIEW" ? (
            <ReviewEditor
              jobId={job.id}
              reason={job.failureReason}
              rows={rows.map((r) => ({
                id: r.id,
                empId: r.empId ?? "",
                fullName: r.fullName,
                workingDays: Number(r.workingDays),
                otHours: Number(r.otHours),
                confidence: Number(r.overallConfidence),
              }))}
            />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Full name</TableHead>
                    <TableHead>Working days</TableHead>
                    <TableHead>OT hours</TableHead>
                    <TableHead>Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.empId ?? "—"}</TableCell>
                      <TableCell>{r.fullName}</TableCell>
                      <TableCell>{Number(r.workingDays)}</TableCell>
                      <TableCell>{Number(r.otHours)}</TableCell>
                      <TableCell>
                        {r.humanVerified ? (
                          <Badge variant="outline">Verified</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Invoice
              <Badge variant={invoice.status === "VALIDATED" ? "default" : "secondary"}>
                {invoice.status}
              </Badge>
              <span className="text-sm font-normal text-muted-foreground">
                {invoice.currency} {Number(invoice.totalAmount).toFixed(2)} · {invoice.payPeriod}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <span className="font-mono text-xs">{l.empId}</span> {l.employeeName}
                      </TableCell>
                      <TableCell>{Number(l.gross).toFixed(2)}</TableCell>
                      <TableCell>{Number(l.otAmount).toFixed(2)}</TableCell>
                      <TableCell>{Number(l.deductions).toFixed(2)}</TableCell>
                      <TableCell>{Number(l.netPay).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {invoice.validations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Validation</p>
                <ul className="space-y-1.5">
                  {invoice.validations.map((v) => (
                    <li key={v.id} className="flex items-center gap-2 text-sm">
                      <Badge variant={validationVariant(v.status)}>{v.status}</Badge>
                      <span>{v.ruleLabel}</span>
                      {v.status !== "PASS" && v.actual && (
                        <span className="text-xs text-muted-foreground">({v.actual})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pipeline events</CardTitle>
        </CardHeader>
        <CardContent>
          <EventTimeline events={job.events} />
        </CardContent>
      </Card>
    </div>
  );
}
