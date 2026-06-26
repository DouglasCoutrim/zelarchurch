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
      <div className="flex min-h-screen w-full bg-n-50">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-transparent">
          <OfflineBanner />
          <AppTopbar onSignOut={handleSignOut} email={session.user.email ?? ""} />
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

function AppTopbar({ onSignOut, email }: { onSignOut: () => void; email: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const pageLabel = getPageLabel(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-n-200 bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <SidebarTrigger className="rounded-md hover:bg-n-100 hover:text-n-700" />
      <Separator orientation="vertical" className="h-5" />

      {/* Breadcrumb: tenant › page */}
      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm md:flex">
        <span className="font-medium text-n-400">{currentTenant?.name ?? "Zelar"}</span>
        <ChevronRight className="h-3.5 w-3.5 text-n-300" />
        <span className="font-semibold text-n-800">{pageLabel}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <TenantSwitcher />
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          className="hidden items-center gap-2 rounded-md border border-n-200 bg-white px-2.5 py-1.5 text-xs text-n-500 transition-colors hover:border-n-300 hover:text-n-700 md:inline-flex"
        >
          <Search className="h-3.5 w-3.5" />
          Buscar…
          <kbd className="ml-2 rounded bg-n-100 px-1.5 py-0.5 font-mono text-[10px] text-n-600">
            ⌘K
          </kbd>
        </button>
        <InviteMemberButton />
        <NotificationBell />
        <Link
          to="/app/profile"
          className="hidden text-xs text-n-500 transition-colors hover:text-navy sm:inline"
        >
          {email}
        </Link>
        <Button variant="ghost" size="sm" onClick={onSignOut}>
          <LogOut className="mr-1 h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
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

