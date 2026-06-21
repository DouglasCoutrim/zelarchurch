import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, Search } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationBell } from "@/components/NotificationBell";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app")({
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
      navigate({ to: "/auth", replace: true });
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
        Carregando...
      </div>
    );
  }
  if (!session) return null;

  return (
    <SidebarProvider>
      <CommandPalette />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
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
                className="hidden items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted md:inline-flex"
              >
                <Search className="h-3.5 w-3.5" />
                Buscar…
                <kbd className="ml-2 rounded bg-background px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>
              <NotificationBell />
              <Link
                to="/app/profile"
                className="hidden text-xs text-muted-foreground hover:underline sm:inline"
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
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
