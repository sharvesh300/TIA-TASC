"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createContractVersionAction, type ContractFormState } from "../actions";

const initialState: ContractFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Create version"}
    </Button>
  );
}

export function NewContractDialog({
  clientId,
  defaultCurrency,
}: {
  clientId: string;
  defaultCurrency?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createContractVersionAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus />
          New contract version
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <input type="hidden" name="clientId" value={clientId} />
          <DialogHeader>
            <DialogTitle>New contract version</DialogTitle>
            <DialogDescription>
              The current active contract (if any) will be archived and replaced by this version.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="markupPercent">Markup %</Label>
              <Input id="markupPercent" name="markupPercent" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentTermsDays">Payment terms (days)</Label>
              <Input id="paymentTermsDays" name="paymentTermsDays" type="number" min="0" defaultValue={30} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" defaultValue={defaultCurrency ?? "AED"} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validFrom">Valid from</Label>
              <Input id="validFrom" name="validFrom" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
