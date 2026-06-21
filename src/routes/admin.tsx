import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, LogOut, ShieldAlert } from "lucide-react";

import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Super Admin — Zelar" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const authLoading = useAuthStore((s) => s.loading);
  const { data: profile, isLoading: profileLoading, error } = useSuperAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (!profileLoading && profile && profile.is_super_admin === false) {
      navigate({ to: "/app", replace: true });
    }
  }, [authLoading, session, profile, profileLoading, navigate]);

  if (authLoading || profileLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-mesh text-sm text-muted-foreground">
        Verificando permissões...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-mesh p-6">
        <div className="rounded-2xl glass-strong p-8 text-center shadow-elevated">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold">Não foi possível validar seu acesso</h1>
          <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!profile.is_super_admin) return null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const crumb = pathname
    .replace(/^\/admin\/?/, "")
    .split("/")[0]
    ?.replace(/-/g, " ") || "Dashboard";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full gradient-mesh">
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-transparent">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 glass-strong px-4">
            <SidebarTrigger className="rounded-md hover:bg-accent" />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs uppercase tracking-wider text-brand-gold">Admin</span>
              <span className="text-sm font-medium capitalize">{crumb}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {profile.name || profile.email || session?.user.email}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link to="/app">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Voltar para App
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />
                Sair
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="page-enter">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
