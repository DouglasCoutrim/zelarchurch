import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/plans";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({ meta: [{ title: "Planos — Admin Zelar" }] }),
  component: AdminPlans,
});

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  max_members: number;
  max_departments: number;
  is_active: boolean;
}

async function loadPlans() {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, slug, description, price_monthly, max_members, max_departments, is_active")
    .order("price_monthly", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanRow[];
}

function AdminPlans() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-plans"], queryFn: loadPlans });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-brand-gold">Comercial</p>
        <h1 className="text-3xl font-bold tracking-tight">Planos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catálogo de planos comercializados.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 text-sm text-muted-foreground">Carregando…</CardContent>
              </Card>
            ))
          : data?.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" /> {p.name}
                    </span>
                    {p.is_active ? (
                      <Badge variant="secondary">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{p.description ?? "—"}</p>
                  <p className="text-2xl font-bold text-gradient-navy">
                    {p.price_monthly > 0 ? formatBRL(p.price_monthly) : "Sob consulta"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Até {p.max_members.toLocaleString("pt-BR")} membros · {p.max_departments} departamentos
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
