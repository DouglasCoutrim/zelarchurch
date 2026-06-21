import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
  Plus,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";

type NavItem = { label: string; to: string; icon: LucideIcon; keywords?: string };

const NAV: NavItem[] = [
  { label: "Painel", to: "/app", icon: LayoutDashboard, keywords: "dashboard home início" },
  { label: "Membros", to: "/app/members", icon: Users, keywords: "pessoas irmãos" },
  { label: "Departamentos", to: "/app/departments", icon: Building2 },
  { label: "Financeiro", to: "/app/financeiro", icon: Wallet, keywords: "dinheiro caixa contas" },
  { label: "Escalas", to: "/app/escalas", icon: CalendarDays, keywords: "cultos agenda" },
  { label: "EBD", to: "/app/ebd", icon: GraduationCap, keywords: "escola dominical" },
  { label: "Atas", to: "/app/atas", icon: FileText },
  { label: "Convocações", to: "/app/convocacoes", icon: Megaphone },
  { label: "Conselho Fiscal", to: "/app/conselho-fiscal", icon: ShieldCheck },
  { label: "Check-in", to: "/app/checkin", icon: ClipboardCheck, keywords: "presença" },
  { label: "Patrimônio", to: "/app/patrimonio", icon: Boxes, keywords: "bens" },
  { label: "Compras", to: "/app/compras", icon: ShoppingCart },
  { label: "Relatórios", to: "/app/relatorios", icon: BarChart3 },
  { label: "Notificações", to: "/app/notificacoes", icon: Bell },
  { label: "Auditoria", to: "/app/auditoria", icon: History, keywords: "logs" },
  { label: "Configurações", to: "/app/settings", icon: Settings, keywords: "ajustes equipe" },
];

const ACTIONS: NavItem[] = [
  { label: "Novo membro", to: "/app/members/new", icon: Plus },
  { label: "Trocar de igreja", to: "/select-tenant", icon: Building2 },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(to: string) {
    setOpen(false);
    // Cast to any because the type-safe paths union doesn't accept dynamic strings here.
    navigate({ to: to as never });
  }

  async function signOut() {
    setOpen(false);
    await supabase.auth.signOut();
    useAuthStore.getState().reset();
    useTenantStore.getState().reset();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar páginas, ações…" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        <CommandGroup heading="Navegar">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.to}
                value={`${item.label} ${item.keywords ?? ""}`}
                onSelect={() => go(item.to)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações">
          {ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            );
          })}
          <CommandItem value="Sair logout" onSelect={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
            <CommandShortcut>⇧⌘Q</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
