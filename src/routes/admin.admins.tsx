import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/admins")({
  head: () => ({ meta: [{ title: "Administradores — Admin Zelar" }] }),
  component: AdminAdmins,
});

interface SuperAdminRow {
  user_id: string;
  name: string | null;
  email: string | null;
  created_at: string;
}

async function loadAdmins() {
  const { data, error } = await supabase
    .from("super_admins")
    .select("user_id, name, email, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SuperAdminRow[];
}

function AdminAdmins() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-admins"], queryFn: loadAdmins });

  const [form, setForm] = useState({ user_id: "", name: "", email: "" });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.user_id) throw new Error("Informe o UUID do usuário");
      const { error } = await supabase.from("super_admins").insert({
        user_id: form.user_id,
        name: form.name || null,
        email: form.email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ user_id: "", name: "", email: "" });
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await supabase.from("super_admins").delete().eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-admins"] }),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-brand-gold">Sistema</p>
        <h1 className="text-3xl font-bold tracking-tight">Administradores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quem pode acessar o painel super admin.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Promover usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="user_id">UUID do usuário (auth.users.id)</Label>
              <Input
                id="user_id"
                value={form.user_id}
                onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          {add.isError && (
            <p className="text-sm text-destructive">{(add.error as Error).message}</p>
          )}
          <Button variant="gold" onClick={() => add.mutate()} disabled={add.isPending}>
            {add.isPending ? "Adicionando…" : "Adicionar como super admin"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Lista de super admins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : data && data.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {data.map((a) => (
                <li key={a.user_id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-navy text-white shadow-md">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{a.name || "(sem nome)"}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.email || a.user_id} · desde{" "}
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Remover acesso de super admin de ${a.email || a.user_id}?`)) {
                        remove.mutate(a.user_id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum super admin cadastrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
