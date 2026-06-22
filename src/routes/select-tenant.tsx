import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, LogOut, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase, initializeTenantSession } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { APP_NAME } from "@/config/constants";
import logoAsset from "@/assets/logo-zelar.svg.asset.json";
import type { Tenant } from "@/types/tenant";

export const Route = createFileRoute("/select-tenant")({
  head: () => ({
    meta: [
      { title: "Selecionar área de trabalho" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SelectTenantPage,
});

function SelectTenantPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const authLoading = useAuthStore((s) => s.loading);
  const tenants = useTenantStore((s) => s.tenants);
  const tenantLoading = useTenantStore((s) => s.loading);
  const setCurrentTenant = useTenantStore((s) => s.setCurrentTenant);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/auth", replace: true });
  }, [authLoading, session, navigate]);

  async function pick(tenant: Tenant) {
    setSubmitting(tenant.id);
    setError(null);
    try {
      await initializeTenantSession(tenant.id);
      setCurrentTenant(tenant);
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao selecionar área");
      setSubmitting(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (authLoading || tenantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-mesh text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gradient-mesh px-4 py-10">
      <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <Link to="/" className="mb-8 flex items-center gap-2 page-enter">
        <img src={logoAsset.url} alt={APP_NAME} className="h-16 w-auto" />
      </Link>

      <div className="relative w-full max-w-lg rounded-2xl glass-strong p-8 shadow-elevated page-enter">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Selecione sua área de trabalho</h1>
          <p className="text-sm text-muted-foreground">
            {tenants.length === 0
              ? "Você ainda não pertence a nenhuma igreja."
              : "Escolha em qual igreja deseja entrar agora."}
          </p>
        </div>

        <div className="space-y-3">
          {tenants.map((t, i) => (
            <button
              key={t.id}
              type="button"
              disabled={submitting !== null}
              onClick={() => pick(t)}
              style={{ animationDelay: `${i * 60}ms` }}
              className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background hover:shadow-card-hover disabled:opacity-60 page-enter"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg gradient-navy text-white shadow-md">
                <Building2 className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold leading-tight">{t.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {submitting === t.id ? "Entrando..." : "Clique para abrir o painel"}
                </span>
              </span>
              <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">→</span>
            </button>
          ))}

          {tenants.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 bg-background/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Solicite a um administrador um convite, ou cadastre uma nova igreja.
              </p>
              <Button asChild variant="gold" className="mt-4">
                <Link to="/register">
                  <Plus className="mr-1 h-4 w-4" />
                  Cadastrar nova igreja
                </Link>
              </Button>
            </div>
          )}

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 border-t border-border/60 pt-4">
          <Button variant="ghost" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
