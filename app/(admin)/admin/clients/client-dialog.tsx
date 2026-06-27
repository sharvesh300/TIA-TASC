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
  createClientAction,
  updateClientAction,
  type ClientFormState,
} from "./actions";
import type { Client } from "@/lib/generated/prisma/client";

const initialState: ClientFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function NewClientDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createClientAction, initialState);
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
          New client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>New client</DialogTitle>
            <DialogDescription>Add a new client organization.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" placeholder="Auto-generated if left blank" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>
          <DialogFooter>
            <SubmitButton label="Create client" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(updateClientAction, initialState);
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
          <input type="hidden" name="id" value={client.id} />
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
            <DialogDescription>Update {client.name}&apos;s details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" name="name" defaultValue={client.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-code">Code</Label>
              <Input id="edit-code" name="code" defaultValue={client.code} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-city">City</Label>
              <Input id="edit-city" name="city" defaultValue={client.city ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-industry">Industry</Label>
              <Input id="edit-industry" name="industry" defaultValue={client.industry ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-contactEmail">Contact email</Label>
              <Input
                id="edit-contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={client.contactEmail ?? ""}
              />
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
