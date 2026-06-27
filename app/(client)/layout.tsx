import { LayoutDashboard, UploadCloud, FileText, Users } from "lucide-react";
import { requireRole } from "@/lib/require-role";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { countClientInboxJobs } from "@/repositories/inbox.repo";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["CLIENT", "ADMIN"]);
  const inboxCount = session.user.clientId ? await countClientInboxJobs(session.user.clientId) : 0;

  const nav = [
    {
      label: "Overview",
      items: [{ label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Workspace",
      items: [
        { label: "Upload Portal", href: "/portal", icon: UploadCloud, badge: inboxCount },
        { label: "Invoices", href: "/portal/invoices", icon: FileText },
        { label: "Employees", href: "/portal/employees", icon: Users },
      ],
    },
  ];

  return (
    <DashboardShell nav={nav} user={{ email: session.user.email!, role: session.user.role }}>
      {children}
    </DashboardShell>
  );
}
