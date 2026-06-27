"use client";

import { useState, useTransition } from "react";
import { FileText, RefreshCw, ShieldCheck, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobStatus } from "@/lib/generated/prisma/client";
import {
  generateInvoiceAction,
  rerunExtractionAction,
  resumeJobAction,
  validateInvoiceAction,
} from "./actions";

// Action buttons for a pipeline job, shown according to the job's current stage.
export function JobActions({
  jobId,
  status,
  invoiceId,
}: {
  jobId: string;
  status: JobStatus;
  invoiceId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  const canExtract = status !== "DISPATCHED" && status !== "NEEDS_REVIEW";
  const canResume = status === "NEEDS_REVIEW";
  const canGenerate = status === "EXTRACTED";
  const canValidate = status === "VALIDATING" && Boolean(invoiceId);

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
      </div>
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
