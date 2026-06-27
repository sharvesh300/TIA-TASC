import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Color = "amber" | "blue" | "violet" | "rose" | "emerald" | "slate";

const COLOR_CLASSES: Record<Color, string> = {
  amber: "bg-amber-500/10 text-amber-500 group-hover/card:bg-amber-500",
  blue: "bg-blue-500/10 text-blue-500 group-hover/card:bg-blue-500",
  violet: "bg-violet-500/10 text-violet-500 group-hover/card:bg-violet-500",
  rose: "bg-rose-500/10 text-rose-500 group-hover/card:bg-rose-500",
  emerald: "bg-emerald-500/10 text-emerald-500 group-hover/card:bg-emerald-500",
  slate: "bg-slate-500/10 text-slate-500 group-hover/card:bg-slate-500",
};

export function StatCard({
  icon: Icon,
  color,
  label,
  value,
  href,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: Color;
  label: string;
  value: React.ReactNode;
  href?: string;
  hint?: string;
}) {
  const card = (
    <Card className="hover:shadow-md transition-all duration-300 hover:border-foreground/20 group/card">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          {hint && <CardDescription>{hint}</CardDescription>}
        </div>
        <div className={`p-2 rounded-lg group-hover/card:text-white transition-all duration-300 ${COLOR_CLASSES[color]}`}>
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-heading">{value}</div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href} className="block">{card}</Link> : card;
}
