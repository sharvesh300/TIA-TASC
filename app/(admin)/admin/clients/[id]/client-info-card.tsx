"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditClientDialog } from "../client-dialog";
import type { Client } from "@/lib/generated/prisma/client";

export function ClientInfoCard({ client }: { client: Client }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Client info</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil />
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">City</dt>
            <dd>{client.city ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Industry</dt>
            <dd>{client.industry ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contact email</dt>
            <dd>{client.contactEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{client.createdAt.toLocaleDateString()}</dd>
          </div>
        </dl>
      </CardContent>
      <EditClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
    </Card>
  );
}
