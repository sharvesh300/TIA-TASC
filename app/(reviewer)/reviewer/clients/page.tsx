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
import { ReviewerClientsToolbar } from "./clients-toolbar";
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
    <Link href={`/reviewer/clients?${params.toString()}`} className="inline-flex items-center gap-1">
      {label}
      <Icon className="size-3.5 text-muted-foreground" />
    </Link>
  );
}

export default async function ReviewerClientsPage({
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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground">
          {total} client{total === 1 ? "" : "s"} organization directory.
        </p>
      </div>

      <ReviewerClientsToolbar />

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No clients found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((client) => (
              <TableRow key={client.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="font-mono text-xs">{client.code}</TableCell>
                <TableCell>{client.city ?? "—"}</TableCell>
                <TableCell>{client.industry ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"}>
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {client.createdAt.toLocaleDateString()}
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
              <Link href={`/reviewer/clients?${pageParams.toString()}&page=${page - 1}`}>
                <ChevronLeft className="size-4" />
                Previous
              </Link>
            ) : (
              <span>
                <ChevronLeft className="size-4" />
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
              <Link href={`/reviewer/clients?${pageParams.toString()}&page=${page + 1}`}>
                Next
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span>
                Next
                <ChevronRight className="size-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
