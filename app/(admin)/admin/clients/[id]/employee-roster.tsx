"use client";

import { useTransition } from "react";
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { unassignEmployeeAction } from "../actions";
import type { Employee } from "@/lib/generated/prisma/client";

export function EmployeeRoster({
  clientId,
  employees,
}: {
  clientId: string;
  employees: Employee[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleRemove(employeeId: string) {
    startTransition(() => {
      unassignEmployeeAction(employeeId, clientId);
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
          <TableHead>Status</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
