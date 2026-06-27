"use client";

import { MoreHorizontal, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleClientStatusAction } from "./actions";
import type { Client } from "@/lib/generated/prisma/client";

export function ClientRowActions({ client }: { client: Client }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant={client.status === "ACTIVE" ? "destructive" : "default"}
          onSelect={() => toggleClientStatusAction(client.id, client.status)}
        >
          <Power />
          {client.status === "ACTIVE" ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
