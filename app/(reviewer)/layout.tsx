import { LayoutDashboard } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";

const nav = [{ label: "Dashboard", href: "/reviewer", icon: LayoutDashboard }];

export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["REVIEWER", "ADMIN"]);
  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
