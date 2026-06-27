import { Inbox, LayoutDashboard, FileText, Building2 } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { countReviewerInboxInvoices } from "@/repositories/inbox.repo";

export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["REVIEWER", "ADMIN"]);
  const inboxCount = await countReviewerInboxInvoices();

  const nav = [
    {
      label: "Overview",
      items: [{ label: "Dashboard", href: "/reviewer/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Workspace",
      items: [
        { label: "Inbox", href: "/reviewer", icon: Inbox, badge: inboxCount },
        { label: "Invoices", href: "/reviewer/invoices", icon: FileText },
        { label: "Clients", href: "/reviewer/clients", icon: Building2 },
      ],
    },
  ];

  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
