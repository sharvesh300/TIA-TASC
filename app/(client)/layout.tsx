import { LayoutDashboard, FileText, Users } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";

const nav = [
  { label: "Upload Portal", href: "/portal", icon: LayoutDashboard },
  { label: "Invoices", href: "/portal/invoices", icon: FileText },
  { label: "Employees", href: "/portal/employees", icon: Users },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["CLIENT", "ADMIN"]);
  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
