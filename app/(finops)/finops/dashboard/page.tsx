import { FileSpreadsheet, AlertCircle, CheckCircle2, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/require-role";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendAreaChart, BreakdownBarChart, DistributionPieChart } from "@/components/dashboard/charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { listAllJobs } from "@/repositories/job.repo";
import { countFinOpsInboxJobs } from "@/repositories/inbox.repo";
import { listRecentEvents } from "@/repositories/event.repo";
import { topClientsByVolume } from "@/repositories/analytics.repo";
import {
  jobVolumeByDay,
  jobStatusBreakdown,
  engineUsageBreakdown,
  averageConfidence,
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

const ENGINE_LABEL: Record<string, string> = {
  NONE: "None",
  EXCEL: "Excel/CSV",
  TESSERACT: "OCR (Tesseract)",
  GPT4O: "GPT-4o vision",
};

export default async function FinOpsDashboardPage() {
  await requireRole(["FINOPS", "ADMIN"]);

  const [jobs, inboxCount, volumeByDay, statusBreakdown, engineBreakdown, avgConfidence, recentEvents, topClients] =
    await Promise.all([
      listAllJobs(),
      countFinOpsInboxJobs(),
      jobVolumeByDay(14),
      jobStatusBreakdown(),
      engineUsageBreakdown(),
      averageConfidence(),
      listRecentEvents(8),
      topClientsByVolume(5),
    ]);

  const total = jobs.length;
  const dispatched = jobs.filter((j) => j.status === "DISPATCHED").length;
  const failed = jobs.filter((j) => j.status === "FAILED").length;

  const statusChartData = statusBreakdown.map((s) => ({
    status: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));
  const engineChartData = engineBreakdown.map((e) => ({
    engine: ENGINE_LABEL[e.engine] ?? e.engine,
    count: e.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
          FinOps Dashboard
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Extraction throughput, confidence, and engine usage across every client.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileSpreadsheet} color="violet" label="Total uploads" value={total} hint="All-time" />
        <StatCard
          icon={AlertCircle}
          color="amber"
          label="In the inbox"
          value={inboxCount}
          href="/finops/inbox"
          hint="Needs review or failed"
        />
        <StatCard icon={CheckCircle2} color="emerald" label="Dispatched" value={dispatched} hint="Successfully invoiced" />
        <StatCard
          icon={Gauge}
          color="blue"
          label="Avg. confidence"
          value={avgConfidence !== null ? `${Math.round(avgConfidence * 100)}%` : "—"}
          hint={`${failed} failed all-time`}
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BreakdownBarChart
            title="Extraction engine usage"
            description="Which engine handled each job"
            data={engineChartData}
            dataKey="count"
            xKey="engine"
            color="#06b6d4"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top clients</CardTitle>
            <CardDescription>By upload volume</CardDescription>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="space-y-3">
                {topClients.map((c) => (
                  <li key={c.clientId} className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="text-muted-foreground text-xs">{c.count} jobs</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <RecentActivity
        title="Recent pipeline activity"
        description="Latest extraction, validation, and dispatch events across clients"
        events={recentEvents}
      />
    </div>
  );
}
