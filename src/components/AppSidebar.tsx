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
  Megaphone,
  ShieldCheck,
  Bell,
  History,
  QrCode,
  HandHeart,
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
import faviconAsset from "@/assets/favicon-zelar.svg.asset.json";
import logoAsset from "@/assets/logo-zelar.svg.asset.json";

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
    label: "Início",
    items: [{ title: "Dashboard", url: "/app", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Organização",
    items: [
      { title: "Membros", url: "/app/members", icon: Users },
      { title: "Congregações", url: "/app/congregations", icon: Building2 },
      { title: "Departamentos", url: "/app/departments", icon: Building2 },
      { title: "Códigos de acesso", url: "/app/invitations", icon: QrCode },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Escalas", url: "/app/escalas", icon: CalendarDays },
      { title: "Minhas escalas", url: "/app/minhas-escalas", icon: CalendarDays },
      { title: "Check-in", url: "/app/checkin", icon: ClipboardCheck },
      { title: "EBD", url: "/app/ebd", icon: GraduationCap },
      { title: "Atas", url: "/app/atas", icon: FileText },
      { title: "Assiduidade", url: "/app/escalas-relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Financeiro", url: "/app/financeiro", icon: Wallet },
      { title: "Compras", url: "/app/compras", icon: ShoppingCart },
      { title: "Patrimônio", url: "/app/patrimonio", icon: Boxes },
      { title: "Conselho Fiscal", url: "/app/conselho-fiscal", icon: ShieldCheck },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { title: "Convocações", url: "/app/convocacoes", icon: Megaphone },
      { title: "Pedidos de oração", url: "/app/oracao", icon: HandHeart },
      { title: "Notificações", url: "/app/notificacoes", icon: Bell },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Relatórios", url: "/app/relatorios", icon: BarChart3 },
      { title: "Auditoria", url: "/app/auditoria", icon: History },
      { title: "Configurações", url: "/app/settings", icon: Settings },
    ],
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
      <SidebarHeader className="border-b border-white/5 px-4 pt-6 pb-5">
        <div className="flex items-center justify-center">
          {collapsed ? (
            <img
              src={faviconAsset.url}
              alt={APP_NAME}
              className="h-9 w-9 shrink-0 rounded-md object-contain"
            />
          ) : (
            <img
              src={logoAsset.url}
              alt={APP_NAME}
              className="h-16 w-auto object-contain drop-shadow-[0_4px_12px_rgba(200,150,62,0.25)]"
            />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1 px-2 py-3">
        {sections.map((section) => (
          <SidebarGroup key={section.label} className="px-1 py-1.5">
            {!collapsed && (
              <SidebarGroupLabel className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  if (item.soon) {
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          disabled
                          className="cursor-not-allowed rounded-xl px-3 py-2.5 opacity-50"
                          tooltip={collapsed ? `${item.title} — em breve` : undefined}
                        >
                          <Icon className="h-4 w-4" />
                          {!collapsed && (
                            <span className="flex w-full items-center justify-between">
                              <span>{item.title}</span>
                              <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/40">
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
                        className="rounded-xl px-3 py-2.5 transition-all duration-200"
                      >
                        <Link to={item.url} className={cn("flex items-center gap-3")}>
                          <Icon className="h-[17px] w-[17px] shrink-0" />
                          {!collapsed && <span className="text-[13.5px] font-medium">{item.title}</span>}
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

