import { Inbox, LayoutDashboard, GitBranch, FileText, Building2, Users } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { countFinOpsInboxJobs } from "@/repositories/inbox.repo";

export default async function FinOpsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  const inboxCount = await countFinOpsInboxJobs();

  const nav = [
    {
      label: "Overview",
      items: [{ label: "Dashboard", href: "/finops/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Workspace",
      items: [
        { label: "Inbox", href: "/finops/inbox", icon: Inbox, badge: inboxCount },
        { label: "Pipeline", href: "/finops", icon: GitBranch },
        { label: "Invoices", href: "/finops/invoices", icon: FileText },
        { label: "Clients", href: "/finops/clients", icon: Building2 },
        { label: "Employees", href: "/finops/employees", icon: Users },
      ],
    },
  ];

  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
