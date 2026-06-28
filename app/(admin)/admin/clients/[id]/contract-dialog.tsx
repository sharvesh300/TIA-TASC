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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createContractVersionAction, type ContractFormState } from "../actions";
import { DEFAULT_CONTRACT_WORK_RULES, type ContractWorkRulesConfig } from "@/lib/constants";

const BILLING_PERIOD_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Biweekly" },
  { value: "DAILY", label: "Daily" },
] as const;

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
  defaultWorkRules,
  defaultBillingPeriodType,
}: {
  clientId: string;
  defaultCurrency?: string;
  defaultWorkRules?: ContractWorkRulesConfig | null;
  defaultBillingPeriodType?: "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "DAILY";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createContractVersionAction, initialState);
  const wasPending = useRef(false);
  const [billingPeriodType, setBillingPeriodType] = useState(defaultBillingPeriodType ?? "MONTHLY");

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  const today = new Date().toISOString().slice(0, 10);
  const wr = { ...DEFAULT_CONTRACT_WORK_RULES, ...defaultWorkRules };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus />
          New contract version
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form action={formAction}>
          <input type="hidden" name="clientId" value={clientId} />
          <DialogHeader>
            <DialogTitle>New contract version</DialogTitle>
            <DialogDescription>
              The current active contract (if any) will be archived and replaced by this version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Billing terms</h3>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="markupPercent">Markup %</Label>
                  <Input id="markupPercent" name="markupPercent" type="number" step="0.01" min="0" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paymentTermsDays">Payment terms (days)</Label>
                  <Input
                    id="paymentTermsDays"
                    name="paymentTermsDays"
                    type="number"
                    min="0"
                    defaultValue={30}
                    required
                  />
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
                  <Label htmlFor="billingPeriodType">Billing period</Label>
                  <input type="hidden" name="billingPeriodType" value={billingPeriodType} />
                  <Select value={billingPeriodType} onValueChange={(v) => setBillingPeriodType(v as typeof billingPeriodType)}>
                    <SelectTrigger id="billingPeriodType" className="w-full" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_PERIOD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t pt-3">
              <h3 className="text-sm font-medium text-muted-foreground">Work rules</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="standardHoursPerShift">Standard hours/shift</Label>
                  <Input
                    id="standardHoursPerShift"
                    name="standardHoursPerShift"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={wr.standardHoursPerShift}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="standardHoursPerWeek">Standard hours/week</Label>
                  <Input
                    id="standardHoursPerWeek"
                    name="standardHoursPerWeek"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={wr.standardHoursPerWeek}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="breakDeductionMinutes">Break deduction (min)</Label>
                  <Input
                    id="breakDeductionMinutes"
                    name="breakDeductionMinutes"
                    type="number"
                    min="0"
                    defaultValue={wr.breakDeductionMinutes}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shiftAllowance">Shift allowance</Label>
                  <Input
                    id="shiftAllowance"
                    name="shiftAllowance"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={wr.shiftAllowance}
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    id="overtimeAllowed"
                    name="overtimeAllowed"
                    type="checkbox"
                    defaultChecked={wr.overtimeAllowed}
                    className="size-4 rounded border-input"
                  />
                  <Label htmlFor="overtimeAllowed">Overtime allowed</Label>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="overtimeMultiplier">Overtime multiplier</Label>
                  <Input
                    id="overtimeMultiplier"
                    name="overtimeMultiplier"
                    type="number"
                    step="0.1"
                    min="1"
                    defaultValue={wr.overtimeMultiplier}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxOvertimeHoursPerDay">Max OT hours/day</Label>
                  <Input
                    id="maxOvertimeHoursPerDay"
                    name="maxOvertimeHoursPerDay"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={wr.maxOvertimeHoursPerDay}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxOvertimeHoursPerWeek">Max OT hours/week</Label>
                  <Input
                    id="maxOvertimeHoursPerWeek"
                    name="maxOvertimeHoursPerWeek"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={wr.maxOvertimeHoursPerWeek}
                  />
                </div>
              </div>
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
