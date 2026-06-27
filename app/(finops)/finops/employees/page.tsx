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
import { listEmployeesFiltered } from "@/repositories/employee.repo";
import { listClients } from "@/repositories/client.repo";
import { FinOpsEmployeesToolbar } from "./employees-toolbar";

const PAGE_SIZE = 10;

type SearchParams = {
  q?: string;
  clientId?: string;
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
  column: "fullName" | "empId" | "department" | "createdAt";
  searchParams: SearchParams;
}) {
  const activeSort = searchParams.sort ?? "fullName";
  const activeDir = searchParams.dir === "desc" ? "desc" : "asc";
  const isActive = activeSort === column;
  const nextDir = isActive && activeDir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.clientId) params.set("clientId", searchParams.clientId);
  params.set("sort", column);
  params.set("dir", nextDir);

  const Icon = !isActive ? ArrowUpDown : activeDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <Link href={`/finops/employees?${params.toString()}`} className="inline-flex items-center gap-1">
      {label}
      <Icon className="size-3.5 text-muted-foreground" />
    </Link>
  );
}

export default async function FinOpsEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const sort = (params.sort as "fullName" | "empId" | "department" | "createdAt") ?? "fullName";
  const dir = params.dir === "desc" ? "desc" : "asc";

  const [{ rows, total }, clients] = await Promise.all([
    listEmployeesFiltered({
      q: params.q,
      clientId: params.clientId,
      sort,
      dir,
      page,
      pageSize: PAGE_SIZE,
    }),
    listClients(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageParams = new URLSearchParams();
  if (params.q) pageParams.set("q", params.q);
  if (params.clientId) pageParams.set("clientId", params.clientId);
  pageParams.set("sort", sort);
  pageParams.set("dir", dir);

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground">
          {total} employee{total === 1 ? "" : "s"} across all customer organizations.
        </p>
      </div>

      <FinOpsEmployeesToolbar clients={clientOptions} />

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortLink label="Name" column="fullName" searchParams={params} />
              </TableHead>
              <TableHead>
                <SortLink label="Employee ID" column="empId" searchParams={params} />
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead>
                <SortLink label="Department" column="department" searchParams={params} />
              </TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((employee) => (
              <TableRow key={employee.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">{employee.fullName}</TableCell>
                <TableCell className="font-mono text-xs">{employee.empId}</TableCell>
                <TableCell>{employee.client.name}</TableCell>
                <TableCell>{employee.department ?? "—"}</TableCell>
                <TableCell>{employee.jobTitle ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={employee.status === "ACTIVE" ? "default" : "secondary"}>
                    {employee.status}
                  </Badge>
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
              <Link href={`/finops/employees?${pageParams.toString()}&page=${page - 1}`}>
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
              <Link href={`/finops/employees?${pageParams.toString()}&page=${page + 1}`}>
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
