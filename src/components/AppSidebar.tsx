import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  Wallet,
  CalendarDays,
  FileText,
  ClipboardCheck,
  Boxes,
  BarChart3,
  ShoppingCart,
  GraduationCap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/config/constants";
import { cn } from "@/lib/utils";

type Item = {
  title: string;
  url: string;
  icon: LucideIcon;
  exact?: boolean;
  soon?: boolean;
};

type Section = { label: string; items: Item[] };

const sections: Section[] = [
  {
    label: "Principal",
    items: [{ title: "Painel", url: "/app", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Gestão",
    items: [
      { title: "Membros", url: "/app/members", icon: Users },
      { title: "Departamentos", url: "/app/departments", icon: Building2 },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Financeiro", url: "/app/financeiro", icon: Wallet },
      { title: "Escalas", url: "/app/escalas", icon: CalendarDays },
      { title: "EBD", url: "/app/ebd", icon: GraduationCap },
      { title: "Atas", url: "/app/atas", icon: FileText },
      { title: "Check-in", url: "/app/checkin", icon: ClipboardCheck },
      { title: "Patrimônio", url: "/app/patrimonio", icon: Boxes },
      { title: "Compras", url: "/app/compras", icon: ShoppingCart },
      { title: "Relatórios", url: "/app/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [{ title: "Configurações", url: "/app/settings", icon: Settings }],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string, exact?: boolean) =>
    exact ? currentPath === url : currentPath === url || currentPath.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
            {APP_NAME.slice(0, 1)}
          </div>
          {!collapsed && <span className="truncate font-semibold">{APP_NAME}</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  if (item.soon) {
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          disabled
                          className="cursor-not-allowed opacity-60"
                          tooltip={collapsed ? `${item.title} — em breve` : undefined}
                        >
                          <Icon className="h-4 w-4" />
                          {!collapsed && (
                            <span className="flex w-full items-center justify-between">
                              <span>{item.title}</span>
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                em breve
                              </span>
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  const active = isActive(item.url, item.exact);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={collapsed ? item.title : undefined}
                      >
                        <Link to={item.url} className={cn("flex items-center gap-2")}>
                          <Icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
