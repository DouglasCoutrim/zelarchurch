import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Configurações — Admin Zelar" }] }),
  component: AdminSettings,
});

interface SettingRow {
  id: string;
  setting_key: string;
  setting_value: unknown;
  description: string | null;
}

async function loadSettings() {
  const { data, error } = await supabase
    .from("saas_settings")
    .select("id, setting_key, setting_value, description")
    .order("setting_key");
  if (error) throw error;
  return (data ?? []) as SettingRow[];
}

function AdminSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: loadSettings });
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      const next: Record<string, string> = {};
      for (const row of data) {
        next[row.setting_key] = JSON.stringify(row.setting_value);
      }
      setValues(next);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async (row: SettingRow) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(values[row.setting_key] ?? "null");
      } catch {
        throw new Error(`Valor inválido para ${row.setting_key} (use JSON: 14, "texto", true, etc.)`);
      }
      const { error } = await supabase
        .from("saas_settings")
        .update({ setting_value: parsed })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-settings"] }),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-brand-gold">Sistema</p>
        <h1 className="text-3xl font-bold tracking-tight">Configurações globais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Parâmetros que afetam toda a plataforma.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Parâmetros do SaaS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {data?.map((row) => (
            <div
              key={row.id}
              className="grid gap-2 rounded-md border border-border/60 p-4 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <Label htmlFor={row.setting_key} className="font-mono text-xs">
                  {row.setting_key}
                </Label>
                {row.description && (
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                )}
                <Input
                  id={row.setting_key}
                  className="mt-2 font-mono text-sm"
                  value={values[row.setting_key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [row.setting_key]: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => save.mutate(row)}
                  disabled={save.isPending}
                >
                  <Save className="mr-1 h-4 w-4" /> Salvar
                </Button>
              </div>
            </div>
          ))}
          {save.isError && (
            <p className="text-sm text-destructive">{(save.error as Error).message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
