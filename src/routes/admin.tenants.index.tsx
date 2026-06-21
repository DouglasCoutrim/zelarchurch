import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, Search, Sparkles } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/tenants/")({
  head: () => ({ meta: [{ title: "Igrejas — Admin Zelar" }] }),
  component: TenantsList,
});

interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  is_courtesy: boolean | null;
  courtesy_until: string | null;
}

async function loadTenants(): Promise<AdminTenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, slug, created_at, is_courtesy, courtesy_until")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminTenant[];
}

function TenantsList() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-tenants"], queryFn: loadTenants });

  const filtered = (data ?? []).filter(
    (t) =>
      !query.trim() ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.slug.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-brand-gold">Operação</p>
        <h1 className="text-3xl font-bold tracking-tight">Igrejas (Tenants)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie todas as igrejas cadastradas no Zelar.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Lista de igrejas
            </span>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nome ou slug…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {(error as Error).message}
            </p>
          )}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma igreja encontrada.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((t) => (
                <li key={t.id}>
                  <Link
                    to="/admin/tenants/$id"
                    params={{ id: t.id }}
                    className="group flex items-center gap-3 py-3 transition-colors hover:bg-accent/30 rounded-md px-2"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg gradient-navy text-white shadow-md">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="font-medium leading-tight">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        /{t.slug} · criada em{" "}
                        {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {t.is_courtesy && (
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3 text-brand-gold" />
                        Cortesia
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
