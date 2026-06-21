import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Wallet, ShieldCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Admin Zelar" }] }),
  component: AdminDashboard,
});

async function loadStats() {
  const [tenants, users, courtesy, admins] = await Promise.all([
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("is_courtesy", true),
    supabase.from("super_admins").select("user_id", { count: "exact", head: true }),
  ]);
  return {
    tenants: tenants.count ?? 0,
    users: users.count ?? 0,
    courtesy: courtesy.count ?? 0,
    admins: admins.count ?? 0,
  };
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: loadStats });

  const cards = [
    { label: "Igrejas cadastradas", value: data?.tenants, icon: Building2, tone: "text-primary" },
    { label: "Usuários no SaaS", value: data?.users, icon: Users, tone: "text-brand-emerald" },
    { label: "Igrejas em cortesia", value: data?.courtesy, icon: Sparkles, tone: "text-brand-gold" },
    { label: "Super admins ativos", value: data?.admins, icon: ShieldCheck, tone: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-brand-gold">Painel administrativo</p>
        <h1 className="text-3xl font-bold tracking-tight">Visão geral do SaaS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas operacionais do Zelar em tempo real.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-5 w-5 ${tone}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">
                {isLoading ? "…" : (value ?? 0).toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Próximos passos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use o menu lateral para gerenciar igrejas, planos, gateways de pagamento e
          configurações globais da plataforma.
        </CardContent>
      </Card>
    </div>
  );
}
