"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadTimesheetAction, type UploadState } from "./actions";

const initialState: UploadState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Upload />
      {pending ? "Uploading..." : "Upload timesheet"}
    </Button>
  );
}

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadTimesheetAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.ok) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state.ok]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="file">Timesheet file</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp"
          required
        />
        <p className="text-xs text-muted-foreground">
          Excel, PDF, or image. Excel is parsed directly; PDFs and images use OCR.
        </p>
      </div>
      <SubmitButton />
      {state.error && <p className="text-sm text-destructive sm:w-full">{state.error}</p>}
    </form>
  );
}
