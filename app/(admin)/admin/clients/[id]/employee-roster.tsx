"use client";

import { useTransition } from "react";
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { unassignEmployeeAction, assignEmployeeContractAction } from "../actions";
import type { Employee } from "@/lib/generated/prisma/client";

export function EmployeeRoster({
  clientId,
  employees,
  contracts,
}: {
  clientId: string;
  employees: Employee[];
  contracts: { id: string; label: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleRemove(employeeId: string) {
    startTransition(() => {
      unassignEmployeeAction(employeeId, clientId);
    });
  }

  function handleContractChange(employeeId: string, value: string) {
    startTransition(() => {
      assignEmployeeContractAction(employeeId, clientId, value === "__default__" ? null : value);
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Job title</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Contract</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
              No employees assigned to this client.
            </TableCell>
          </TableRow>
        )}
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell className="font-mono text-xs">{employee.empId}</TableCell>
            <TableCell className="font-medium">{employee.fullName}</TableCell>
            <TableCell>{employee.jobTitle ?? "—"}</TableCell>
            <TableCell>{employee.department ?? "—"}</TableCell>
            <TableCell>
              <Select
                value={employee.contractId ?? "__default__"}
                onValueChange={(value) => handleContractChange(employee.id, value)}
              >
                <SelectTrigger className="w-44" size="sm">
                  <SelectValue placeholder="Client default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Client default</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Badge variant={employee.status === "ACTIVE" ? "default" : "secondary"}>
                {employee.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => handleRemove(employee.id)}
                title="Remove from client"
              >
                <UserMinus />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
