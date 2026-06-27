import { CloudUpload, CheckCircle, Clock, CreditCard } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendAreaChart, DistributionPieChart } from "@/components/dashboard/charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { listJobsByClient } from "@/repositories/job.repo";
import { listInvoicesByClient } from "@/repositories/invoice.repo";
import { invoiceTotalsByPeriod, jobStatusBreakdown } from "@/repositories/analytics.repo";
import { listRecentEvents } from "@/repositories/event.repo";

const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Uploaded",
  QUEUED: "Queued",
  EXTRACTING: "Extracting",
  NEEDS_REVIEW: "Needs review",
  EXTRACTED: "Extracted",
  GENERATING_INVOICE: "Generating",
  VALIDATING: "Validating",
  READY_FOR_DISPATCH: "Ready",
  DISPATCHED: "Dispatched",
  FAILED: "Failed",
};

export default async function ClientDashboardPage() {
  const session = await requireRole(["CLIENT", "ADMIN"]);
  const clientId = session.user.clientId;

  if (!clientId) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a client organization, so there is no data to show.
        </p>
      </div>
    );
  }

  const [jobs, invoices, totalsByPeriod, statusBreakdown, recentEvents] = await Promise.all([
    listJobsByClient(clientId),
    listInvoicesByClient(clientId),
    invoiceTotalsByPeriod(clientId, 8),
    jobStatusBreakdown(clientId),
    listRecentEvents(8, clientId),
  ]);

  const totalTimesheets = jobs.length;
  const approvedInvoicesCount = invoices.filter((inv) => inv.status === "APPROVED" || inv.status === "DISPATCHED").length;
  const pendingActionCount = invoices.filter((inv) => inv.status === "DRAFT" || inv.status === "VALIDATED").length;
  const totalBilledAmount = invoices
    .filter((inv) => inv.status === "APPROVED" || inv.status === "DISPATCHED")
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const statusChartData = statusBreakdown.map((s) => ({
    status: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 bg-clip-text text-transparent dark:from-teal-400 dark:via-emerald-400 dark:to-green-400">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          A snapshot of your timesheet activity and billing across all submitted periods.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CloudUpload} color="emerald" label="Timesheets sent" value={totalTimesheets} href="/portal" hint="Total uploaded files" />
        <StatCard icon={CheckCircle} color="emerald" label="Approved invoices" value={approvedInvoicesCount} href="/portal/invoices" hint="Ready for billing" />
        <StatCard icon={Clock} color="amber" label="Pending action" value={pendingActionCount} href="/portal/invoices" hint="Awaiting review" />
        <StatCard
          icon={CreditCard}
          color="blue"
          label="Total billed"
          value={`AED ${totalBilledAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          hint="Approved sum"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendAreaChart
            title="Billed amount by period"
            description="Your invoice value over time"
            data={totalsByPeriod}
            dataKey="total"
            xKey="payPeriod"
            color="#10b981"
            valueType="currency"
          />
        </div>
        <DistributionPieChart
          title="Timesheet status"
          description="Current state of your uploads"
          data={statusChartData}
          dataKey="count"
          nameKey="status"
        />
      </div>

      <RecentActivity
        title="Recent activity"
        description="Latest updates on your timesheets and invoices"
        events={recentEvents}
      />
    </div>
  );
}
