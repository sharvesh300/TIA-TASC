"use client";

import { useState, useTransition } from "react";
import { FileText, RefreshCw, ShieldCheck, PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InvoiceStatus, JobStatus } from "@/lib/generated/prisma/client";
import {
  generateInvoiceAction,
  rejectInvoiceAction,
  rerunExtractionAction,
  resumeJobAction,
  validateInvoiceAction,
} from "./actions";

// Action buttons for a pipeline job, shown according to the job's current stage.
export function JobActions({
  jobId,
  status,
  invoiceId,
  invoiceStatus,
}: {
  jobId: string;
  status: JobStatus;
  invoiceId?: string;
  invoiceStatus?: InvoiceStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  function reject() {
    if (!invoiceId) return;
    run(async () => {
      await rejectInvoiceAction(jobId, invoiceId, note || "No reason provided");
      setRejecting(false);
      setNote("");
    });
  }

  const canExtract = status !== "DISPATCHED" && status !== "NEEDS_REVIEW";
  const canResume = status === "NEEDS_REVIEW";
  const canGenerate = status === "EXTRACTED";
  const canValidate = status === "VALIDATING" && Boolean(invoiceId);
  const canReject =
    Boolean(invoiceId) && invoiceStatus !== "DISPATCHED" && invoiceStatus !== "REJECTED";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canResume && (
          <Button size="sm" onClick={() => run(() => resumeJobAction(jobId))} disabled={pending}>
            <PlayCircle />
            Resume pipeline
          </Button>
        )}
        {canExtract && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => run(() => rerunExtractionAction(jobId))}
            disabled={pending}
          >
            <RefreshCw />
            Re-run extraction
          </Button>
        )}
        {canGenerate && (
          <Button size="sm" onClick={() => run(() => generateInvoiceAction(jobId))} disabled={pending}>
            <FileText />
            Generate invoice
          </Button>
        )}
        {canValidate && invoiceId && (
          <Button
            size="sm"
            onClick={() => run(() => validateInvoiceAction(jobId, invoiceId))}
            disabled={pending}
          >
            <ShieldCheck />
            Run validation
          </Button>
        )}
        {canReject && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRejecting((v) => !v)}
            disabled={pending}
          >
            <X />
            Reject
          </Button>
        )}
      </div>
      {rejecting && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Reason for rejection"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="destructive" size="sm" onClick={reject} disabled={pending}>
            Confirm reject
          </Button>
        </div>
      )}
      {canResume && !error && (
        <p className="text-xs text-muted-foreground">
          The pipeline auto-advances after extraction, invoicing, and validation. Use{" "}
          <strong>Resume pipeline</strong> once the underlying issue (e.g. a missing contract or
          unmatched employee) is fixed elsewhere, or correct the rows below first.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
