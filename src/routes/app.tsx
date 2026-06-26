import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChevronRight, LogOut, Search } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { InviteMemberButton } from "@/components/InviteMemberButton";
import { NotificationBell } from "@/components/NotificationBell";
import { OfflineBanner } from "@/components/OfflineBanner";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";

const ROUTE_LABELS: Record<string, string> = {
  "/app": "Painel",
  "/app/members": "Membros",
  "/app/departments": "Departamentos",
  "/app/congregations": "Congregações",
  "/app/invitations": "Códigos de acesso",
  "/app/financeiro": "Financeiro",
  "/app/escalas": "Escalas",
  "/app/minhas-escalas": "Minhas escalas",
  "/app/escalas-relatorios": "Assiduidade",
  "/app/ebd": "EBD",
  "/app/atas": "Atas",
  "/app/convocacoes": "Convocações",
  "/app/conselho-fiscal": "Conselho Fiscal",
  "/app/checkin": "Check-in",
  "/app/patrimonio": "Patrimônio",
  "/app/compras": "Compras",
  "/app/oracao": "Pedidos de oração",
  "/app/relatorios": "Relatórios",
  "/app/notificacoes": "Notificações",
  "/app/auditoria": "Auditoria",
  "/app/settings": "Configurações",
  "/app/profile": "Perfil",
};

function getPageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // longest-prefix match (handles nested routes like /app/members/:id)
  const match = Object.keys(ROUTE_LABELS)
    .filter((k) => pathname === k || pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ROUTE_LABELS[match] : "Painel";
}


export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const tenantLoading = useTenantStore((s) => s.loading);
  const tenants = useTenantStore((s) => s.tenants);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (!tenantLoading && !currentTenant) {
      navigate({ to: "/select-tenant", replace: true });
    }
  }, [loading, session, tenantLoading, currentTenant, tenants, navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    useAuthStore.getState().reset();
    useTenantStore.getState().reset();
    navigate({ to: "/auth", replace: true });
  }

  if (loading || tenantLoading || !currentTenant) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-mesh text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Carregando...
        </div>
      </div>
    );
  }
  if (!session) return null;

  return (
    <SidebarProvider>
      <CommandPalette />
      <div className="flex min-h-screen w-full gradient-mesh">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-transparent">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[rgba(30,58,95,0.08)] bg-white/70 px-4 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(30,58,95,0.10)]">
            <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground rounded-md" />
            <Separator orientation="vertical" className="h-6" />
            <TenantSwitcher />
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", metaKey: true }),
                  );
                }}
                className="hidden items-center gap-2 rounded-md border border-border/70 bg-background/50 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-background hover:text-foreground md:inline-flex"
              >
                <Search className="h-3.5 w-3.5" />
                Buscar…
                <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>
              <InviteMemberButton />
              <NotificationBell />
              <Link
                to="/app/profile"
                className="hidden text-xs text-muted-foreground transition-colors hover:text-primary sm:inline"
              >
                {session.user.email}
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />
                Sair
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
