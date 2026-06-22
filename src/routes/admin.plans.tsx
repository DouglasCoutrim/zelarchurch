import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  max_congregations: number | null;
  is_active: boolean;
}

async function loadPlans() {
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, name, slug, description, price_monthly, max_members, max_departments, max_congregations, is_active",
    )
    .order("price_monthly", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanRow[];
}

function formatCongregations(value: number | null): string {
  if (value === null) return "Ilimitado";
  if (value === 0) return "Nenhuma";
  return String(value);
}

function MaxCongregationsEditor({ plan }: { plan: PlanRow }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<string>(
    plan.max_congregations === null ? "" : String(plan.max_congregations),
  );

  useEffect(() => {
    setValue(plan.max_congregations === null ? "" : String(plan.max_congregations));
  }, [plan.max_congregations]);

  const save = useMutation({
    mutationFn: async (raw: string) => {
      const next = raw.trim() === "" ? null : Number(raw);
      if (next !== null && (!Number.isInteger(next) || next < 0)) {
        throw new Error("Use um número inteiro maior ou igual a zero.");
      }
      const { error } = await supabase
        .from("plans")
        .update({ max_congregations: next })
        .eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-plans"] }),
  });

  const current = plan.max_congregations === null ? "" : String(plan.max_congregations);

  return (
    <div className="space-y-1.5 pt-2">
      <Label htmlFor={`maxcong-${plan.id}`} className="text-xs">
        Máximo de congregações
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={`maxcong-${plan.id}`}
          type="number"
          min={0}
          step={1}
          placeholder="Vazio = ilimitado"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-40"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => save.mutate(value)}
          disabled={save.isPending || value === current}
        >
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Atual: {formatCongregations(plan.max_congregations)} · deixe vazio para ilimitado.
      </p>
      {save.isError && (
        <p className="text-[11px] text-destructive">{(save.error as Error).message}</p>
      )}
    </div>
  );
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
                    Até {p.max_members.toLocaleString("pt-BR")} membros · {p.max_departments} departamentos · {formatCongregations(p.max_congregations)} congregações
                  </p>
                  <MaxCongregationsEditor plan={p} />
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
