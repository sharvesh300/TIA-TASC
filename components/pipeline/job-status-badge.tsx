import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/generated/prisma/client";

type Variant = "default" | "secondary" | "destructive" | "outline";

const STATUS_META: Record<JobStatus, { label: string; variant: Variant }> = {
  UPLOADED: { label: "Uploaded", variant: "secondary" },
  QUEUED: { label: "Queued", variant: "secondary" },
  EXTRACTING: { label: "Extracting", variant: "outline" },
  NEEDS_REVIEW: { label: "Needs review", variant: "destructive" },
  EXTRACTED: { label: "Extracted", variant: "outline" },
  GENERATING_INVOICE: { label: "Generating invoice", variant: "outline" },
  VALIDATING: { label: "Validating", variant: "outline" },
  READY_FOR_DISPATCH: { label: "Ready for dispatch", variant: "default" },
  DISPATCHED: { label: "Dispatched", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
