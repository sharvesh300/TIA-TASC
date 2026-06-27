"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditEmployeeDialog } from "./employee-dialog";
import { toggleEmployeeStatusAction } from "./actions";
import type { Employee } from "@/lib/generated/prisma/client";

export function EmployeeRowActions({
  employee,
  clients,
}: {
  employee: Employee;
  clients: { id: string; name: string }[];
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant={employee.status === "ACTIVE" ? "destructive" : "default"}
            onSelect={() => toggleEmployeeStatusAction(employee.id, employee.status)}
          >
            <Power />
            {employee.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditEmployeeDialog
        employee={employee}
        clients={clients}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
