import { CheckSquare, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendAreaChart, DistributionPieChart } from "@/components/dashboard/charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { listAllInvoices } from "@/repositories/invoice.repo";
import { countReviewerInboxInvoices } from "@/repositories/inbox.repo";
import { listRecentEvents } from "@/repositories/event.repo";
import {
  invoiceTotalsByPeriod,
  invoiceStatusBreakdown,
  validationOutcomeBreakdown,
  averageTurnaroundHours,
} from "@/repositories/analytics.repo";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  VALIDATED: "Validated",
  DISPATCHED: "Dispatched",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  QUERIED: "Queried",
};

const OUTCOME_LABEL: Record<string, string> = {
  PASS: "Pass",
  WARNING: "Warning",
  BLOCKER: "Blocker",
};

export default async function ReviewerDashboardPage() {
  await requireRole(["REVIEWER", "ADMIN"]);

  const [invoices, inboxCount, totalsByPeriod, statusBreakdown, validationBreakdown, turnaround, recentEvents] =
    await Promise.all([
      listAllInvoices(),
      countReviewerInboxInvoices(),
      invoiceTotalsByPeriod(undefined, 8),
      invoiceStatusBreakdown(),
      validationOutcomeBreakdown(),
      averageTurnaroundHours(),
      listRecentEvents(8),
    ]);

  const dispatched = invoices.filter((i) => i.status === "DISPATCHED").length;
  const rejected = invoices.filter((i) => i.status === "REJECTED").length;

  const statusChartData = statusBreakdown.map((s) => ({
    status: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));
  const validationChartData = validationBreakdown.map((v) => ({
    status: OUTCOME_LABEL[v.status] ?? v.status,
    count: v.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
          Reviewer Dashboard
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Approval throughput and validation quality across every client invoice.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CheckSquare}
          color="amber"
          label="Awaiting approval"
          value={inboxCount}
          href="/reviewer"
          hint="Validated invoices"
        />
        <StatCard icon={ShieldCheck} color="emerald" label="Dispatched" value={dispatched} hint="All-time" />
        <StatCard icon={ShieldAlert} color="rose" label="Rejected" value={rejected} hint="Sent back for correction" />
        <StatCard
          icon={Clock}
          color="blue"
          label="Avg. turnaround"
          value={turnaround !== null ? `${turnaround.toFixed(1)}h` : "—"}
          hint="Upload to dispatch"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendAreaChart
            title="Billed amount by period"
            description="Total invoice value across all clients"
            data={totalsByPeriod}
            dataKey="total"
            xKey="payPeriod"
            color="#10b981"
            valueType="currency"
          />
        </div>
        <DistributionPieChart
          title="Invoice status"
          description="All invoices, current state"
          data={statusChartData}
          dataKey="count"
          nameKey="status"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity
            title="Recent activity"
            description="Latest validation, approval, and dispatch events"
            events={recentEvents}
          />
        </div>
        <DistributionPieChart
          title="Validation outcomes"
          description="Rule results across all invoices"
          data={validationChartData}
          dataKey="count"
          nameKey="status"
        />
      </div>
    </div>
  );
}
