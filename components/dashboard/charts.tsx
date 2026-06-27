"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PALETTE = ["#8b5cf6", "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#64748b"];

function ChartShell({
  title,
  description,
  children,
  height = 240,
  isEmpty,
  raw = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  height?: number;
  isEmpty?: boolean;
  /** Skip the built-in ResponsiveContainer wrap — for content that builds its own (e.g. chart + legend). */
  raw?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div
            style={{ height }}
            className="flex items-center justify-center text-sm text-muted-foreground"
          >
            No data yet.
          </div>
        ) : raw ? (
          children
        ) : (
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
};

export function TrendAreaChart({
  title,
  description,
  data,
  dataKey,
  xKey,
  color = PALETTE[0],
  valueType,
}: {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  dataKey: string;
  xKey: string;
  color?: string;
  valueType?: "currency" | "number";
}) {
  const isEmpty = data.length === 0 || data.every((d) => !Number(d[dataKey]));

  const formatValue = (v: number) => {
    if (valueType === "currency") {
      return `AED ${v.toLocaleString()}`;
    }
    return v.toLocaleString();
  };

  return (
    <ChartShell title={title} description={description} isEmpty={isEmpty}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => formatValue(Number(v))}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={2} />
      </AreaChart>
    </ChartShell>
  );
}

export function BreakdownBarChart({
  title,
  description,
  data,
  dataKey,
  xKey,
  color = PALETTE[1],
}: {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  dataKey: string;
  xKey: string;
  color?: string;
}) {
  const isEmpty = data.length === 0;
  return (
    <ChartShell title={title} description={description} height={280} isEmpty={isEmpty}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ChartShell>
  );
}

export function DistributionPieChart({
  title,
  description,
  data,
  dataKey,
  nameKey,
}: {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
}) {
  const isEmpty = data.length === 0;
  const total = data.reduce((sum, d) => sum + Number(d[dataKey] ?? 0), 0);

  return (
    <ChartShell title={title} description={description} height={isEmpty ? 240 : 300} isEmpty={isEmpty} raw>
      <div className="flex flex-col items-center gap-3">
        <div style={{ width: "100%", height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Pie data={data} dataKey={dataKey} nameKey={nameKey} innerRadius={55} outerRadius={80} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex w-full flex-wrap justify-center gap-x-4 gap-y-1.5">
          {data.map((d, i) => {
            const value = Number(d[dataKey] ?? 0);
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <li key={i} className="flex items-center gap-1.5 text-xs">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <span className="font-medium">{String(d[nameKey])}</span>
                <span className="text-muted-foreground">
                  {value} ({pct}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartShell>
  );
}

export { PALETTE };
