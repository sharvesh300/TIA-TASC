import { LayoutDashboard, FileText, Building2, Users } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";

const nav = [
  { label: "Pipeline", href: "/finops", icon: LayoutDashboard },
  { label: "Invoices", href: "/finops/invoices", icon: FileText },
  { label: "Clients", href: "/finops/clients", icon: Building2 },
  { label: "Employees", href: "/finops/employees", icon: Users },
];

export default async function FinOpsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
