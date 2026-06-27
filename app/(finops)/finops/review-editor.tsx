"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveReviewAction } from "./actions";
import type { RowEdit } from "@/services/review.service";

interface EditableRow {
  id: string;
  empId: string;
  fullName: string;
  workingDays: number;
  otHours: number;
  confidence: number;
}

const LOW_CONFIDENCE = 0.9;

export function ReviewEditor({ jobId, rows }: { jobId: string; rows: EditableRow[] }) {
  const [draft, setDraft] = useState(rows);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update(id: string, field: keyof EditableRow, value: string) {
    setDraft((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]:
                field === "workingDays" || field === "otHours" ? Number(value) || 0 : value,
            }
          : r
      )
    );
  }

  function save() {
    setError(null);
    const edits: RowEdit[] = draft.map((r) => ({
      rowId: r.id,
      empId: r.empId || null,
      fullName: r.fullName,
      workingDays: r.workingDays,
      otHours: r.otHours,
    }));
    startTransition(async () => {
      try {
        await resolveReviewAction(jobId, edits);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save review.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Full name</TableHead>
              <TableHead>Working days</TableHead>
              <TableHead>OT hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draft.map((row) => {
              const low = row.confidence < LOW_CONFIDENCE;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input
                      value={row.empId}
                      onChange={(e) => update(row.id, "empId", e.target.value)}
                      aria-invalid={low && !row.empId}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.fullName}
                      onChange={(e) => update(row.id, "fullName", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.workingDays}
                      onChange={(e) => update(row.id, "workingDays", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.otHours}
                      onChange={(e) => update(row.id, "otHours", e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={save} disabled={pending}>
        {pending ? "Saving..." : "Approve rows"}
      </Button>
    </div>
  );
}
