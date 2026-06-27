import { LayoutDashboard, Users, Building2 } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { countFinOpsInboxJobs, countReviewerInboxInvoices } from "@/repositories/inbox.repo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["ADMIN"]);
  const [finopsInbox, reviewerInbox] = await Promise.all([
    countFinOpsInboxJobs(),
    countReviewerInboxInvoices(),
  ]);

  const nav = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard, badge: finopsInbox + reviewerInbox },
      ],
    },
    {
      label: "Workspace",
      items: [
        { label: "Clients", href: "/admin/clients", icon: Building2 },
        { label: "Employees", href: "/admin/employees", icon: Users },
      ],
    },
  ];

  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
