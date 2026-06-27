"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PollResponse {
  success?: boolean;
  error?: string;
  summary?: {
    emailsFound: number;
    emailsProcessed: number;
    emailsSkipped: number;
    jobsCreated: number;
  };
  details?: { reason?: string }[];
}

export function SyncInboxButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function sync() {
    setPending(true);
    try {
      const res = await fetch("/api/timesheets/poll", { method: "POST" });
      const data: PollResponse = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Gmail sync failed");
        return;
      }

      const { summary } = data;
      if (!summary || summary.emailsFound === 0) {
        toast.info("No new timesheet emails found");
      } else {
        toast.success(
          `Synced ${summary.emailsFound} email(s): ${summary.jobsCreated} job(s) created` +
            (summary.emailsSkipped > 0 ? `, ${summary.emailsSkipped} skipped` : "")
        );
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the Gmail sync endpoint");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={sync} disabled={pending}>
      <RefreshCw className={pending ? "animate-spin" : ""} />
      {pending ? "Syncing…" : "Sync inbox"}
    </Button>
  );
}
