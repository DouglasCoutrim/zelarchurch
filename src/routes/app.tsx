import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, Search, HelpCircle } from "lucide-react";

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
          {/* Stripe-style topbar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-md">
            <SidebarTrigger className="h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900" />
            <Separator orientation="vertical" className="h-6 bg-slate-200" />
            <TenantSwitcher />

            {/* Search — center, Stripe Dashboard style */}
            <div className="ml-4 hidden flex-1 max-w-md md:flex">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
                }}
                className="group inline-flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-700"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Buscar membros, escalas, transações…</span>
                <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 lg:inline-block">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <InviteMemberButton />
              <a
                href="https://docs.lovable.dev/features/cloud"
                target="_blank"
                rel="noreferrer"
                className="hidden h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 md:inline-flex"
                aria-label="Ajuda"
              >
                <HelpCircle className="h-4 w-4" />
              </a>
              <NotificationBell />
              <Separator orientation="vertical" className="mx-1 h-6 bg-slate-200" />
              <Link
                to="/app/profile"
                className="hidden items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--navy)] text-[11px] font-bold text-white">
                  {(session.user.email ?? "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[180px] truncate">{session.user.email}</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 text-slate-500 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 px-6 py-6 lg:px-8">
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
