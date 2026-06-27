import { LayoutDashboard } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";

const nav = [{ label: "Dashboard", href: "/portal", icon: LayoutDashboard }];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["CLIENT", "ADMIN"]);
  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
