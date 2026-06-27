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
import { EditClientDialog } from "./client-dialog";
import { toggleClientStatusAction } from "./actions";
import type { Client } from "@/lib/generated/prisma/client";

export function ClientRowActions({ client }: { client: Client }) {
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
            variant={client.status === "ACTIVE" ? "destructive" : "default"}
            onSelect={() => toggleClientStatusAction(client.id, client.status)}
          >
            <Power />
            {client.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
