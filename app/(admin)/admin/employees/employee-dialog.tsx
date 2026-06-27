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
import {
  createEmployeeAction,
  updateEmployeeAction,
  type EmployeeFormState,
} from "./actions";
import type { Employee } from "@/lib/generated/prisma/client";

const initialState: EmployeeFormState = {};

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

const UNASSIGNED_VALUE = "__unassigned__";

function ClientSelect({ clients, defaultValue }: { clients: { id: string; name: string }[]; defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue || UNASSIGNED_VALUE);
  return (
    <>
      <input type="hidden" name="clientId" value={value === UNASSIGNED_VALUE ? "" : value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

export function NewEmployeeDialog({
  clients,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createEmployeeAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          New employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>New employee</DialogTitle>
            <DialogDescription>Add a new employee record.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="clientId">Client</Label>
              <ClientSelect clients={clients} defaultValue={defaultClientId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empId">Employee ID</Label>
              <Input id="empId" name="empId" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" name="jobTitle" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" name="nationality" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateOfJoining">Date of joining</Label>
              <Input id="dateOfJoining" name="dateOfJoining" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" name="iban" />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>
          <DialogFooter>
            <SubmitButton label="Create employee" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditEmployeeDialog({
  employee,
  clients,
  open,
  onOpenChange,
}: {
  employee: Employee;
  clients: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(updateEmployeeAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      onOpenChange(false);
    }
    wasPending.current = pending;
  }, [pending, state.error, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={formAction}>
          <input type="hidden" name="id" value={employee.id} />
          <DialogHeader>
            <DialogTitle>Edit employee</DialogTitle>
            <DialogDescription>Update {employee.fullName}&apos;s details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-clientId">Client</Label>
              <ClientSelect clients={clients} defaultValue={employee.clientId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-empId">Employee ID</Label>
              <Input id="edit-empId" name="empId" defaultValue={employee.empId} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-fullName">Full name</Label>
              <Input id="edit-fullName" name="fullName" defaultValue={employee.fullName} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" name="email" type="email" defaultValue={employee.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-jobTitle">Job title</Label>
              <Input id="edit-jobTitle" name="jobTitle" defaultValue={employee.jobTitle ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-department">Department</Label>
              <Input id="edit-department" name="department" defaultValue={employee.department ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-nationality">Nationality</Label>
              <Input id="edit-nationality" name="nationality" defaultValue={employee.nationality ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dateOfJoining">Date of joining</Label>
              <Input
                id="edit-dateOfJoining"
                name="dateOfJoining"
                type="date"
                defaultValue={toDateInputValue(employee.dateOfJoining)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-iban">IBAN</Label>
              <Input id="edit-iban" name="iban" defaultValue={employee.iban ?? ""} />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>
          <DialogFooter>
            <SubmitButton label="Save changes" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
