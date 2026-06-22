import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Sparkles, Save, Church } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/tenants/$id")({
  head: () => ({ meta: [{ title: "Igreja — Admin Zelar" }] }),
  component: TenantDetail,
});

interface AdminTenantDetail {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  created_at: string;
  is_courtesy: boolean | null;
  courtesy_until: string | null;
  courtesy_reason: string | null;
}

async function loadTenant(id: string): Promise<AdminTenantDetail> {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, slug, plan_id, created_at, is_courtesy, courtesy_until, courtesy_reason")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as AdminTenantDetail;
}

interface CongregationsSummary {
  current: number;
  max: number | null;
  planName: string | null;
}

async function loadCongregationsSummary(
  tenantId: string,
  planId: string | null,
): Promise<CongregationsSummary> {
  const countQ = supabase
    .from("congregations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const planQ = planId
    ? supabase.from("plans").select("name, max_congregations").eq("id", planId).maybeSingle()
    : Promise.resolve({ data: null, error: null } as { data: null; error: null });

  const [{ count, error: cErr }, planRes] = await Promise.all([countQ, planQ]);
  if (cErr) throw cErr;
  if (planRes.error) throw planRes.error;

  return {
    current: count ?? 0,
    max: (planRes.data?.max_congregations ?? null) as number | null,
    planName: (planRes.data?.name ?? null) as string | null,
  };
}

function TenantDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["admin-tenant", id],
    queryFn: () => loadTenant(id),
  });

  const { data: congSummary } = useQuery({
    queryKey: ["admin-tenant-congregations", id, tenant?.plan_id ?? null],
    enabled: !!tenant,
    queryFn: () => loadCongregationsSummary(id, tenant?.plan_id ?? null),
  });

  const [form, setForm] = useState({
    is_courtesy: false,
    courtesy_until: "",
    courtesy_reason: "",
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        is_courtesy: !!tenant.is_courtesy,
        courtesy_until: tenant.courtesy_until ? tenant.courtesy_until.slice(0, 10) : "",
        courtesy_reason: tenant.courtesy_reason ?? "",
      });
    }
  }, [tenant]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({
          is_courtesy: form.is_courtesy,
          courtesy_until: form.is_courtesy && form.courtesy_until ? form.courtesy_until : null,
          courtesy_reason: form.is_courtesy ? form.courtesy_reason || null : null,
        })
        .eq("id", id);
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from("admin_access_logs").insert({
          admin_id: userData.user.id,
          action: "update_tenant_courtesy",
          target_type: "tenant",
          target_id: id,
          details: form,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenant", id] });
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
    },
  });

  if (isLoading || !tenant) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/tenants">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
        {tenant.is_courtesy && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3 text-brand-gold" /> Cortesia ativa
          </Badge>
        )}
      </div>

      <header className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl gradient-navy text-white shadow-md">
          <Building2 className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-xs text-muted-foreground">
            /{tenant.slug} · ID {tenant.id.slice(0, 8)}
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Church className="h-4 w-4 text-primary" /> Congregações
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Atual</p>
            <p className="text-2xl font-bold">{congSummary?.current ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Limite do plano</p>
            <p className="text-2xl font-bold">
              {congSummary
                ? congSummary.max === null
                  ? "Ilimitado"
                  : String(congSummary.max)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Plano</p>
            <p className="text-base font-medium">{congSummary?.planName ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cortesia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
            <div>
              <Label className="text-sm font-medium">Conceder cortesia</Label>
              <p className="text-xs text-muted-foreground">
                Libera o acesso completo sem cobrança até a data limite.
              </p>
            </div>
            <Switch
              checked={form.is_courtesy}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_courtesy: v }))}
            />
          </div>

          {form.is_courtesy && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="courtesy_until">Válida até</Label>
                <Input
                  id="courtesy_until"
                  type="date"
                  value={form.courtesy_until}
                  onChange={(e) => setForm((f) => ({ ...f, courtesy_until: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courtesy_reason">Motivo</Label>
                <Textarea
                  id="courtesy_reason"
                  value={form.courtesy_reason}
                  onChange={(e) => setForm((f) => ({ ...f, courtesy_reason: e.target.value }))}
                  placeholder="Ex.: igreja parceira do projeto missionário…"
                />
              </div>
            </>
          )}

          {save.isError && (
            <p className="text-sm text-destructive">{(save.error as Error).message}</p>
          )}
          {save.isSuccess && (
            <p className="text-sm text-brand-emerald">Alterações salvas com sucesso.</p>
          )}

          <Button variant="gold" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-1 h-4 w-4" />
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
