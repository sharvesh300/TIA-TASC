import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/require-role";
import { getClientById } from "@/repositories/client.repo";
import { listContractsByClient } from "@/repositories/contract.repo";
import { listEmployeesByClient, listUnassignedEmployees } from "@/repositories/employee.repo";
import { ClientInfoCard } from "./client-info-card";
import { NewContractDialog } from "./contract-dialog";
import { EmployeeRoster } from "./employee-roster";
import { EmployeeAssign } from "./employee-assign";
import { NewEmployeeDialog } from "../../employees/employee-dialog";
import { formatDate } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { id } = await params;

  const client = await getClientById(id);
  if (!client) notFound();

  const [contracts, employees, unassignedEmployees] = await Promise.all([
    listContractsByClient(id),
    listEmployeesByClient(id),
    listUnassignedEmployees(),
  ]);

  const latestContract = contracts.find((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-4">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to clients
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{client.name}</h1>
          <p className="text-sm font-mono text-muted-foreground">{client.code}</p>
        </div>
        <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"}>
          {client.status}
        </Badge>
      </div>

      <ClientInfoCard client={client} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contracts</CardTitle>
          <NewContractDialog clientId={client.id} defaultCurrency={latestContract?.currency} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Valid from</TableHead>
                <TableHead>Valid to</TableHead>
                <TableHead>Markup %</TableHead>
                <TableHead>Payment terms</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No contracts yet.
                  </TableCell>
                </TableRow>
              )}
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{formatDate(contract.validFrom)}</TableCell>
                  <TableCell>{formatDate(contract.validTo)}</TableCell>
                  <TableCell>{Number(contract.markupPercent)}%</TableCell>
                  <TableCell>{contract.paymentTermsDays} days</TableCell>
                  <TableCell>{contract.currency}</TableCell>
                  <TableCell>
                    <Badge variant={contract.status === "ACTIVE" ? "default" : "secondary"}>
                      {contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contract.description ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employees</CardTitle>
          <NewEmployeeDialog clients={[{ id: client.id, name: client.name }]} defaultClientId={client.id} />
        </CardHeader>
        <CardContent className="space-y-4">
          <EmployeeAssign clientId={client.id} unassignedEmployees={unassignedEmployees} />
          <EmployeeRoster clientId={client.id} employees={employees} />
        </CardContent>
      </Card>
    </div>
  );
}
