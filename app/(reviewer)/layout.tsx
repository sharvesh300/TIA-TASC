import { LayoutDashboard, FileText, Building2 } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";

const nav = [
  { label: "Approval Queue", href: "/reviewer", icon: LayoutDashboard },
  { label: "Invoices", href: "/reviewer/invoices", icon: FileText },
  { label: "Clients", href: "/reviewer/clients", icon: Building2 },
];

export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["REVIEWER", "ADMIN"]);
  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
