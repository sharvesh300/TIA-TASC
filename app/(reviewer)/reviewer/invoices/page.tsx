import Link from "next/link";
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
import { listAllInvoices } from "@/repositories/invoice.repo";
import { Eye } from "lucide-react";

export default async function ReviewerInvoicesPage() {
  await requireRole(["REVIEWER", "ADMIN"]);
  const invoices = await listAllInvoices();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Audit all generated customer invoices and download their PDFs.
        </p>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Client</TableHead>
              <TableHead className="font-semibold">Pay Period</TableHead>
              <TableHead className="font-semibold">Total Amount</TableHead>
              <TableHead className="font-semibold">Lines</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="w-24 text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No invoices found in the system.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((invoice) => (
              <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">{invoice.client.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{invoice.payPeriod}</TableCell>
                <TableCell className="font-mono text-xs">
                  {invoice.currency} {Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-muted-foreground">{invoice._count.lines}</TableCell>
                <TableCell>
                  <Badge variant={invoice.status === "DISPATCHED" ? "default" : invoice.status === "VALIDATED" ? "secondary" : "outline"} className="font-mono text-xs">
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
