import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listClientsFiltered } from "@/repositories/client.repo";
import { ClientsToolbar } from "./clients-toolbar";
import { NewClientDialog } from "./client-dialog";
import { ClientRowActions } from "./client-row-actions";
import type { ClientStatus } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 10;

type SearchParams = {
  q?: string;
  status?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

function SortLink({
  label,
  column,
  searchParams,
}: {
  label: string;
  column: "name" | "code" | "createdAt";
  searchParams: SearchParams;
}) {
  const activeSort = searchParams.sort ?? "name";
  const activeDir = searchParams.dir === "desc" ? "desc" : "asc";
  const isActive = activeSort === column;
  const nextDir = isActive && activeDir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.status) params.set("status", searchParams.status);
  params.set("sort", column);
  params.set("dir", nextDir);

  const Icon = !isActive ? ArrowUpDown : activeDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <Link href={`/admin/clients?${params.toString()}`} className="inline-flex items-center gap-1">
      {label}
      <Icon className="size-3.5 text-muted-foreground" />
    </Link>
  );
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const sort = (params.sort as "name" | "code" | "createdAt") ?? "name";
  const dir = params.dir === "desc" ? "desc" : "asc";
  const status = params.status as ClientStatus | undefined;

  const { rows, total } = await listClientsFiltered({
    q: params.q,
    status,
    sort,
    dir,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageParams = new URLSearchParams();
  if (params.q) pageParams.set("q", params.q);
  if (params.status) pageParams.set("status", params.status);
  pageParams.set("sort", sort);
  pageParams.set("dir", dir);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {total} client{total === 1 ? "" : "s"}
          </p>
        </div>
        <NewClientDialog />
      </div>

      <ClientsToolbar />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortLink label="Name" column="name" searchParams={params} />
              </TableHead>
              <TableHead>
                <SortLink label="Code" column="code" searchParams={params} />
              </TableHead>
              <TableHead>City</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <SortLink label="Created" column="createdAt" searchParams={params} />
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No clients found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/clients/${client.id}`} className="hover:underline">
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{client.code}</TableCell>
                <TableCell>{client.city ?? "—"}</TableCell>
                <TableCell>{client.industry ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"}>
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <ClientRowActions client={client} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            asChild={page > 1}
            variant="outline"
            size="sm"
            disabled={page <= 1}
          >
            {page > 1 ? (
              <Link href={`/admin/clients?${pageParams.toString()}&page=${page - 1}`}>
                <ChevronLeft />
                Previous
              </Link>
            ) : (
              <span>
                <ChevronLeft />
                Previous
              </span>
            )}
          </Button>
          <Button
            asChild={page < totalPages}
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
          >
            {page < totalPages ? (
              <Link href={`/admin/clients?${pageParams.toString()}&page=${page + 1}`}>
                Next
                <ChevronRight />
              </Link>
            ) : (
              <span>
                Next
                <ChevronRight />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
