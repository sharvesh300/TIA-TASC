import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/require-role";
import { listInvoicesByStatus, listAllInvoices } from "@/repositories/invoice.repo";
import { InvoiceActions } from "./invoice-actions";
import { Clock, CheckSquare, XSquare, CreditCard } from "lucide-react";

export default async function ReviewerPage() {
  await requireRole(["REVIEWER", "ADMIN"]);

  const queue = await listInvoicesByStatus(["VALIDATED"]);
  const history = await listInvoicesByStatus(["DISPATCHED", "REJECTED"]);
  const allInvoices = await listAllInvoices();

  const pendingReview = allInvoices.filter((inv) => inv.status === "VALIDATED").length;
  const approved = allInvoices.filter((inv) => inv.status === "DISPATCHED" || inv.status === "APPROVED").length;
  const rejected = allInvoices.filter((inv) => inv.status === "REJECTED").length;
  const totalAmountApproved = allInvoices
    .filter((inv) => inv.status === "DISPATCHED" || inv.status === "APPROVED")
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
          Inbox
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Invoices that have passed validation and are waiting on your approval. Everything else
          is still flowing through the pipeline automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-300 hover:border-amber-500/50 group/card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Approval</CardTitle>
              <CardDescription>Pending validation</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover/card:bg-amber-500 group-hover/card:text-white transition-all duration-300">
              <Clock className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading text-amber-500">{pendingReview}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300 hover:border-emerald-500/50 group/card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Invoices</CardTitle>
              <CardDescription>Dispatched successfully</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover/card:bg-emerald-500 group-hover/card:text-white transition-all duration-300">
              <CheckSquare className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading text-emerald-500">{approved}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300 hover:border-rose-500/50 group/card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected Invoices</CardTitle>
              <CardDescription>Requires correction</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 group-hover/card:bg-rose-500 group-hover/card:text-white transition-all duration-300">
              <XSquare className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading text-rose-500">{rejected}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300 hover:border-blue-500/50 group/card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Approved Billing</CardTitle>
              <CardDescription>Sum of dispatched</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover/card:bg-blue-500 group-hover/card:text-white transition-all duration-300">
              <CreditCard className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">
              AED {totalAmountApproved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Awaiting your approval</h2>
        {queue.length === 0 && (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckSquare className="size-5" />
            </div>
            <p className="font-medium">Inbox zero</p>
            <p className="text-sm text-muted-foreground">No invoices awaiting approval right now.</p>
          </Card>
        )}
        <div className="grid gap-4">
          {queue.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-sm border transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{invoice.client.name}</span>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-none font-mono">
                      {invoice.status}
                    </Badge>
                  </div>
                  <span className="text-sm font-normal text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {invoice.currency} {Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} · {invoice.payPeriod} ·{" "}
                    {invoice._count.lines} line(s)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceActions invoiceId={invoice.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-xl font-semibold">Approval History</h2>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold">Period</TableHead>
                  <TableHead className="font-semibold">Total Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{invoice.client.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{invoice.payPeriod}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {invoice.currency} {Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === "DISPATCHED" ? "default" : "destructive"} className="font-mono text-xs">
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
