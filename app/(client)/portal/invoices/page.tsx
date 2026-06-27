import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/require-role";
import { listInvoicesByClientWithDetails } from "@/repositories/invoice.repo";
import { Eye } from "lucide-react";

export default async function ClientInvoicesPage() {
  const session = await requireRole(["CLIENT", "ADMIN"]);
  const clientId = session.user.clientId;

  if (!clientId) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a client organization, so there are no invoices to show.
        </p>
      </div>
    );
  }

  const invoices = await listInvoicesByClientWithDetails(clientId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Track and download official monthly invoices generated from timesheet uploads.
        </p>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Pay Period</TableHead>
              <TableHead className="font-semibold">Total Amount</TableHead>
              <TableHead className="font-semibold">Invoice Lines</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Generated</TableHead>
              <TableHead className="w-24 text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No invoices generated yet.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((invoice) => (
              <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-mono text-xs font-medium">{invoice.payPeriod}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {invoice.currency} {Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-muted-foreground">{invoice._count.lines} lines</TableCell>
                <TableCell>
                  <Badge variant={invoice.status === "DISPATCHED" ? "default" : invoice.status === "APPROVED" ? "outline" : "secondary"} className="font-mono text-xs">
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {invoice.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <a
                    href={`/api/invoices/${invoice.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors"
                  >
                    <Eye className="size-4" />
                    View
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
