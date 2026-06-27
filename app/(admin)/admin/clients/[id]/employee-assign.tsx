"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignEmployeeAction } from "../actions";

export function EmployeeAssign({
  clientId,
  unassignedEmployees,
}: {
  clientId: string;
  unassignedEmployees: { id: string; fullName: string; empId: string }[];
}) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAssign() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await assignEmployeeAction(clientId, selected);
      if (result?.error) {
        setError(result.error);
      } else {
        setSelected("");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select unassigned employee" />
        </SelectTrigger>
        <SelectContent>
          {unassignedEmployees.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No unassigned employees</div>
          )}
          {unassignedEmployees.map((emp) => (
            <SelectItem key={emp.id} value={emp.id}>
              {emp.fullName} ({emp.empId})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={!selected || isPending} onClick={handleAssign}>
        <UserPlus />
        Assign
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
