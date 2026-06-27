import { LayoutDashboard } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";

const nav = [{ label: "Dashboard", href: "/finops", icon: LayoutDashboard }];

export default async function FinOpsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
