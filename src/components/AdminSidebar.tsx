import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Wallet,
  ShieldCheck,
  Settings,
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
import logoAsset from "@/assets/logo-zelar.svg.asset.json";
import faviconAsset from "@/assets/favicon-zelar.svg.asset.json";

type Item = { title: string; url: string; icon: LucideIcon; exact?: boolean };

const sections: { label: string; items: Item[] }[] = [
  {
    label: "Visão geral",
    items: [{ title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operação SaaS",
    items: [
      { title: "Igrejas (Tenants)", url: "/admin/tenants", icon: Building2 },
      { title: "Planos", url: "/admin/plans", icon: CreditCard },
      { title: "Faturamento", url: "/admin/billing", icon: Wallet },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Administradores", url: "/admin/admins", icon: ShieldCheck },
      { title: "Configurações", url: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string, exact?: boolean) =>
    exact ? currentPath === url : currentPath === url || currentPath.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md gradient-gold text-[#1b3a6b] font-bold shadow-md">
            Z
          </span>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-semibold tracking-tight">Zelar</span>
              <span className="text-[10px] uppercase tracking-wider text-brand-gold">
                Super Admin
              </span>
            </div>
          )}
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
                  const active = isActive(item.url, item.exact);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={collapsed ? item.title : undefined}
                      >
                        <Link to={item.url} className="flex items-center gap-2">
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
