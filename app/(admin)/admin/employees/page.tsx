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
import { EmployeesToolbar } from "./employees-toolbar";
import { NewEmployeeDialog } from "./employee-dialog";
import { EmployeeRowActions } from "./employee-row-actions";

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
    <Link href={`/admin/employees?${params.toString()}`} className="inline-flex items-center gap-1">
      {label}
      <Icon className="size-3.5 text-muted-foreground" />
    </Link>
  );
}

export default async function AdminEmployeesPage({
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {total} employee{total === 1 ? "" : "s"}
          </p>
        </div>
        <NewEmployeeDialog clients={clientOptions} />
      </div>

      <EmployeesToolbar clients={clientOptions} />

      <div className="rounded-lg border">
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
              <TableHead>Job title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((employee) => (
              <TableRow key={employee.id}>
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
                <TableCell>
                  <EmployeeRowActions employee={employee} clients={clientOptions} />
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
              <Link href={`/admin/employees?${pageParams.toString()}&page=${page - 1}`}>
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
              <Link href={`/admin/employees?${pageParams.toString()}&page=${page + 1}`}>
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
