import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Users,
  Inbox,
  CheckSquare,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendAreaChart, BreakdownBarChart, DistributionPieChart } from "@/components/dashboard/charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { countActiveClients, countClients } from "@/repositories/client.repo";
import { countActiveEmployees, countEmployees } from "@/repositories/employee.repo";
import { listAllJobs } from "@/repositories/job.repo";
import { countFinOpsInboxJobs, countReviewerInboxInvoices } from "@/repositories/inbox.repo";
import { listRecentEvents } from "@/repositories/event.repo";
import {
  jobVolumeByDay,
  jobStatusBreakdown,
  invoiceTotalsByPeriod,
  topClientsByVolume,
} from "@/repositories/analytics.repo";

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

export default async function AdminPage() {
  const [
    clientCount,
    activeClientCount,
    employeeCount,
    activeEmployeeCount,
    jobs,
    finopsInboxCount,
    reviewerInboxCount,
    volumeByDay,
    statusBreakdown,
    totalsByPeriod,
    topClients,
    recentEvents,
  ] = await Promise.all([
    countClients(),
    countActiveClients(),
    countEmployees(),
    countActiveEmployees(),
    listAllJobs(),
    countFinOpsInboxJobs(),
    countReviewerInboxInvoices(),
    jobVolumeByDay(14),
    jobStatusBreakdown(),
    invoiceTotalsByPeriod(undefined, 8),
    topClientsByVolume(6),
    listRecentEvents(8),
  ]);

  const inFlight = jobs.filter(
    (j) => !["DISPATCHED", "FAILED", "NEEDS_REVIEW"].includes(j.status)
  ).length;
  const dispatched = jobs.filter((j) => j.status === "DISPATCHED").length;
  const failed = jobs.filter((j) => j.status === "FAILED").length;

  const statusChartData = statusBreakdown.map((s) => ({
    status: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide view across clients, employees, and the processing pipeline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Inbox}
          color="amber"
          label="FinOps inbox"
          value={finopsInboxCount}
          href="/finops/inbox"
          hint="Needs review or failed"
        />
        <StatCard
          icon={CheckSquare}
          color="blue"
          label="Reviewer inbox"
          value={reviewerInboxCount}
          href="/reviewer"
          hint="Awaiting approval"
        />
        <StatCard
          icon={FileSpreadsheet}
          color="violet"
          label="In flight"
          value={inFlight}
          href="/finops"
          hint="Auto-processing now"
        />
        <StatCard
          icon={AlertTriangle}
          color="rose"
          label="Failed jobs"
          value={failed}
          href="/finops/inbox"
          hint={`${dispatched} dispatched all-time`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendAreaChart
            title="Upload volume"
            description="Timesheets ingested per day, last 14 days"
            data={volumeByDay}
            dataKey="count"
            xKey="date"
          />
        </div>
        <DistributionPieChart
          title="Pipeline status"
          description="All jobs, current state"
          data={statusChartData}
          dataKey="count"
          nameKey="status"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendAreaChart
          title="Billed amount by period"
          description="Total invoice value per pay period"
          data={totalsByPeriod}
          dataKey="total"
          xKey="payPeriod"
          color="#10b981"
          valueType="currency"
        />
        <BreakdownBarChart
          title="Top clients by volume"
          description="Jobs processed, all-time"
          data={topClients}
          dataKey="count"
          xKey="name"
          color="#6366f1"
        />
      </div>

      <RecentActivity
        title="Recent platform activity"
        description="Latest pipeline events across all clients"
        events={recentEvents}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              Clients
            </CardTitle>
            <CardDescription>
              {activeClientCount} active of {clientCount} total
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/clients">
                  View
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{clientCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Employees
            </CardTitle>
            <CardDescription>
              {activeEmployeeCount} active of {employeeCount} total
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/employees">
                  View
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{employeeCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
