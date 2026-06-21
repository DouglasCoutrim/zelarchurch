import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Check, X } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({ meta: [{ title: "Faturamento — Admin Zelar" }] }),
  component: AdminBilling,
});

interface Gateway {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  config: Record<string, unknown>;
}

async function loadGateways() {
  const { data, error } = await supabase
    .from("payment_gateways")
    .select("id, name, slug, is_active, config")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Gateway[];
}

function AdminBilling() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-gateways"], queryFn: loadGateways });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("payment_gateways")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gateways"] }),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-brand-gold">Financeiro</p>
        <h1 className="text-3xl font-bold tracking-tight">Faturamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure os gateways de pagamento aceitos pela plataforma.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          data?.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" /> {g.name}
                  </span>
                  {g.is_active ? (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="h-3 w-3 text-brand-emerald" /> Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <X className="h-3 w-3" /> Inativo
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-xs text-muted-foreground">slug: <code>{g.slug}</code></p>
                <pre className="overflow-x-auto rounded-md border border-border/60 bg-muted/40 p-3 text-xs">
                  {JSON.stringify(g.config, null, 2)}
                </pre>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Aceitar pagamentos</span>
                  <Switch
                    checked={g.is_active}
                    onCheckedChange={(v) => toggle.mutate({ id: g.id, is_active: v })}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de transações</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Em breve — integração com Stripe e Mercado Pago via webhooks.
        </CardContent>
      </Card>
    </div>
  );
}
