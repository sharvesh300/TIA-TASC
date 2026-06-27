"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveInvoiceAction, rejectInvoiceAction } from "./actions";

export function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      try {
        await approveInvoiceAction(invoiceId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to approve.");
      }
    });
  }

  function reject() {
    setError(null);
    startTransition(async () => {
      try {
        await rejectInvoiceAction(invoiceId, note);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reject.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            View PDF
          </a>
        </Button>
        <Button size="sm" onClick={approve} disabled={pending}>
          <Check />
          Approve &amp; send
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRejecting((v) => !v)} disabled={pending}>
          <X />
          Reject
        </Button>
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
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
