import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search, ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAuditLogs, listDistinctEntities, type AuditLogRow } from "@/lib/audit";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria" }] }),
  component: AuditPage,
});

const ACTIONS = ["INSERT", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  const a = action.toUpperCase();
  if (a === "DELETE") return "destructive";
  if (a === "INSERT" || a === "CREATE") return "default";
  if (a === "UPDATE") return "secondary";
  return "outline";
}

function AuditPage() {
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [list, ents] = await Promise.all([
        listAuditLogs(currentTenant.id, {
          entity: entity === "all" ? undefined : entity,
          action: action === "all" ? undefined : action,
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
          limit: 300,
        }),
        listDistinctEntities(currentTenant.id),
      ]);
      setRows(list);
      setEntities(ents);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar auditoria");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id, entity, action, from, to]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.entity.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        (r.entity_id ?? "").toLowerCase().includes(q) ||
        (r.user_id ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Segurança"
        title="Auditoria"
        description="Histórico de ações realizadas na organização."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refine os registros por entidade, ação e período.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Entidade, ID, usuário..."
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Entidade</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ação</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2 md:col-span-1">
            <div className="space-y-2">
              <Label>De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {filtered.map((r) => {
                const isOpen = expanded.has(r.id);
                return (
                  <div key={r.id} className="p-3">
                    <button
                      onClick={() => toggle(r.id)}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      {isOpen ? (
                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={actionVariant(r.action)}>{r.action}</Badge>
                          <span className="font-medium">{r.entity}</span>
                          {r.entity_id && (
                            <span className="font-mono text-xs text-muted-foreground">
                              #{r.entity_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                          {r.user_id && ` • por ${r.user_id.slice(0, 8)}`}
                        </p>
                      </div>
                    </button>
                    {isOpen && r.diff && (
                      <pre className="mt-3 ml-7 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {JSON.stringify(r.diff, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
