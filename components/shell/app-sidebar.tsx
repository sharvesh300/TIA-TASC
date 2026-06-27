import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/sign-out";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Count shown as a badge next to the label — e.g. items needing attention. */
  badge?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

type AppSidebarProps = {
  /** Either a flat list (rendered under a single "Modules" group) or pre-grouped sections. */
  nav: NavItem[] | NavGroup[];
  user: {
    email: string;
    role: string;
  };
};

function isGrouped(nav: NavItem[] | NavGroup[]): nav is NavGroup[] {
  return nav.length > 0 && "items" in nav[0];
}

export function AppSidebar({ nav, user }: AppSidebarProps) {
  const initials = user.email.slice(0, 2).toUpperCase();
  const groups: NavGroup[] = isGrouped(nav) ? nav : [{ label: "Modules", items: nav }];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            T
          </span>
          <span className="font-heading text-lg font-semibold group-data-[collapsible=icon]:hidden">
            TIA
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span className="flex-1">{item.label}</span>
                        {!!item.badge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-5 justify-center rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 group-data-[collapsible=icon]:hidden"
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{user.email}</span>
            <Badge variant="secondary" className="w-fit text-[10px]">
              {user.role}
            </Badge>
          </div>
        </div>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center"
          >
            <LogOut className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
          </Button>
        </form>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
