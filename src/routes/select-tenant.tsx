import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, initializeTenantSession } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
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
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Selecione sua área de trabalho</CardTitle>
          <CardDescription>
            {tenants.length === 0
              ? "Você ainda não pertence a nenhuma igreja."
              : "Escolha em qual igreja deseja entrar."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenants.map((t) => (
            <Button
              key={t.id}
              variant="outline"
              className="w-full justify-start"
              disabled={submitting !== null}
              onClick={() => pick(t)}
            >
              {submitting === t.id ? "Entrando..." : t.name}
            </Button>
          ))}
          {tenants.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Solicite a um administrador um convite, ou cadastre uma nova igreja.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="ghost" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
