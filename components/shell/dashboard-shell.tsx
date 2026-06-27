import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar, type NavItem } from "@/components/shell/app-sidebar";

type DashboardShellProps = {
  nav: NavItem[];
  user: {
    email: string;
    role: string;
  };
  children: React.ReactNode;
};

export function DashboardShell({ nav, user, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar nav={nav} user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
