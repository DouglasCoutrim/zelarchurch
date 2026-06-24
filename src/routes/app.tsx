import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, Search, HelpCircle, Sparkles } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { InviteMemberButton } from "@/components/InviteMemberButton";
import { NotificationBell } from "@/components/NotificationBell";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  component: AppLayout,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

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
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Carregando...
        </div>
      </div>
    );
  }
  if (!session) return null;

  const userName = (session.user.user_metadata?.full_name as string | undefined)
    ?? (session.user.email?.split("@")[0] ?? "você");
  const firstName = userName.split(/[ .]/)[0];

  return (
    <SidebarProvider>
      <CommandPalette />
      <div className="flex min-h-screen w-full bg-[#fafaf7]">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-transparent">
          {/* TopBar unificada — saudação · tenant · busca · ações */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#1E3A5F]/10 bg-white/75 px-4 backdrop-blur-xl">
            <SidebarTrigger className="h-8 w-8 rounded-lg text-[#1E3A5F]/60 transition-colors hover:bg-[#1E3A5F]/8 hover:text-[#1E3A5F]" />

            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <span className="text-[13px] font-semibold text-[#1E3A5F]">
                {greeting()}, {firstName}
              </span>
              <span className="text-[#1E3A5F]/30">·</span>
            </div>

            <TenantSwitcher />

            {/* Busca global ⌘K */}
            <div className="ml-2 hidden flex-1 max-w-[440px] md:flex">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
                }}
                className="group inline-flex w-full items-center gap-2 rounded-lg border border-[#1E3A5F]/12 bg-white/60 px-3 py-1.5 text-[12px] text-[#1E3A5F]/55 transition-all hover:border-[#C8963E]/40 hover:bg-white hover:text-[#1E3A5F]"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Buscar membros, escalas, transações…</span>
                <kbd className="hidden rounded border border-[#1E3A5F]/15 bg-white px-1.5 py-0 font-mono text-[10px] text-[#1E3A5F]/60 lg:inline-block">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <InviteMemberButton />
              <Link
                to="/app/relatorios"
                className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold text-[#C8963E] transition-all hover:bg-[#C8963E]/10 md:inline-flex"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ações rápidas
              </Link>
              <a
                href="https://docs.lovable.dev/features/cloud"
                target="_blank"
                rel="noreferrer"
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-[#1E3A5F]/55 transition-colors hover:bg-[#1E3A5F]/8 hover:text-[#1E3A5F] md:inline-flex"
                aria-label="Ajuda"
              >
                <HelpCircle className="h-4 w-4" />
              </a>
              <NotificationBell />
              <Separator orientation="vertical" className="mx-1.5 h-5 bg-[#1E3A5F]/10" />
              <Link
                to="/app/profile"
                className="hidden items-center gap-2 rounded-lg px-2 py-1 text-[12px] font-medium text-[#1E3A5F]/75 transition-colors hover:bg-[#1E3A5F]/8 hover:text-[#1E3A5F] sm:inline-flex"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#152a47] text-[11px] font-bold text-white shadow-[0_4px_12px_-2px_rgba(30,58,95,0.4)]">
                  {(firstName ?? "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[140px] truncate">{firstName}</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 w-8 p-0 text-[#1E3A5F]/55 hover:bg-[#1E3A5F]/8 hover:text-[#1E3A5F]"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 px-5 py-5 lg:px-8 lg:py-7">
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
