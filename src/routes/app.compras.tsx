import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, ShoppingCart, Check, X, PackageCheck, AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import {
  listPurchaseRequests, createPurchaseRequest, updatePurchaseRequest,
  approvePurchaseRequest, rejectPurchaseRequest, markPurchaseAsBought,
  deletePurchaseRequest,
  PURCHASE_STATUS_OPTIONS, URGENCY_OPTIONS,
  type PurchaseRequestRow, type PurchaseInput, type PurchaseStatus, type PurchaseUrgency,
} from "@/lib/purchases";

export const Route = createFileRoute("/app/compras")({
  head: () => ({ meta: [{ title: "Compras" }] }),
  component: PurchasesPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function statusBadge(s: PurchaseStatus) {
  const map: Record<PurchaseStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    aguardando: { label: "Aguardando", variant: "outline" },
    aprovado: { label: "Aprovado", variant: "secondary" },
    rejeitado: { label: "Rejeitado", variant: "destructive" },
    comprado: { label: "Comprado", variant: "default" },
  };
  const it = map[s];
  return <Badge variant={it.variant}>{it.label}</Badge>;
}

function urgencyBadge(u: PurchaseUrgency) {
  const cls = u === "urgente" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
    : u === "alta" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    : u === "baixa" ? "bg-muted text-muted-foreground"
    : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  return <span className={`rounded px-2 py-0.5 text-xs ${cls}`}>{URGENCY_OPTIONS.find((o) => o.value === u)?.label}</span>;
}

function PurchasesPage() {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const user = useAuthStore((s) => s.user);

  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "all">("all");
  const [editing, setEditing] = useState<PurchaseRequestRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [rejecting, setRejecting] = useState<PurchaseRequestRow | null>(null);
  const [deleting, setDeleting] = useState<PurchaseRequestRow | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["purchases", currentTenant?.id, statusFilter],
    enabled: !!currentTenant?.id,
    queryFn: () => listPurchaseRequests(currentTenant!.id, statusFilter),
  });

  const summary = useMemo(() => {
    const list = data ?? [];
    const totals: Record<PurchaseStatus, number> = {
      aguardando: 0, aprovado: 0, rejeitado: 0, comprado: 0,
    };
    let estimated = 0;
    for (const p of list) {
      totals[p.status]++;
      if (p.status !== "rejeitado") estimated += Number(p.estimated_value ?? 0);
    }
    return { totals, estimated };
  }, [data]);

  const approveMut = useMutation({
    mutationFn: (id: string) => approvePurchaseRequest(id, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
  });
  const boughtMut = useMutation({
    mutationFn: (id: string) => markPurchaseAsBought(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePurchaseRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setDeleting(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
          <p className="text-sm text-muted-foreground">
            Solicitações de aquisição e fluxo de aprovação.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PurchaseStatus | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {PURCHASE_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nova solicitação
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<AlertCircle className="h-4 w-4" />} label="Aguardando" value={String(summary.totals.aguardando)} />
        <Kpi icon={<Check className="h-4 w-4 text-emerald-600" />} label="Aprovadas" value={String(summary.totals.aprovado)} />
        <Kpi icon={<PackageCheck className="h-4 w-4" />} label="Compradas" value={String(summary.totals.comprado)} />
        <Kpi icon={<ShoppingCart className="h-4 w-4" />} label="Valor estimado" value={BRL(summary.estimated)} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-md border p-12 text-center">
          <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma solicitação. Clique em "Nova solicitação" para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {data!.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <span className="truncate">{p.item}</span>
                      <span className="text-sm font-normal text-muted-foreground">× {p.quantity}</span>
                      {statusBadge(p.status)}
                      {urgencyBadge(p.urgency)}
                    </CardTitle>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {p.department?.name && <span>Depto: {p.department.name}</span>}
                      {p.estimated_value != null && <span>Estimado: {BRL(Number(p.estimated_value))}</span>}
                      {p.needed_by && <span>Necessário até: {new Date(p.needed_by).toLocaleDateString("pt-BR")}</span>}
                      {p.supplier_suggestion && <span>Fornecedor sug.: {p.supplier_suggestion}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.status === "aguardando" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => approveMut.mutate(p.id)} disabled={approveMut.isPending}>
                          <Check className="mr-1 h-4 w-4" /> Aprovar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejecting(p)}>
                          <X className="mr-1 h-4 w-4" /> Rejeitar
                        </Button>
                      </>
                    )}
                    {p.status === "aprovado" && (
                      <Button size="sm" variant="outline" onClick={() => boughtMut.mutate(p.id)} disabled={boughtMut.isPending}>
                        <PackageCheck className="mr-1 h-4 w-4" /> Marcar como comprado
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(p)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm">
                <p className="whitespace-pre-wrap text-muted-foreground">{p.justification}</p>
                {p.status === "rejeitado" && p.rejection_reason && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTitle>Motivo da rejeição</AlertTitle>
                    <AlertDescription>{p.rejection_reason}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PurchaseDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        initial={editing}
      />

      <RejectDialog
        request={rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={async (reason) => {
          if (!rejecting || !user) return;
          await rejectPurchaseRequest(rejecting.id, user.id, reason);
          queryClient.invalidateQueries({ queryKey: ["purchases"] });
          setRejecting(null);
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleting?.item}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (deleting) deleteMut.mutate(deleting.id); }}>
              {deleteMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon} {label}
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function RejectDialog({
  request, onClose, onConfirm,
}: {
  request: PurchaseRequestRow | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={!!request} onOpenChange={(v) => { if (!v) { onClose(); setReason(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar solicitação</DialogTitle>
          <DialogDescription>Informe o motivo da rejeição de "{request?.item}".</DialogDescription>
        </DialogHeader>
        <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo..." />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || pending}
            onClick={async () => { setPending(true); try { await onConfirm(reason); setReason(""); } finally { setPending(false); } }}
          >
            {pending ? "Rejeitando..." : "Rejeitar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DeptOption = { id: string; name: string };

function PurchaseDialog({
  open, onOpenChange, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: PurchaseRequestRow | null;
}) {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState<PurchaseInput>(() => fromInitial(initial));

  function update<K extends keyof PurchaseInput>(key: K, value: PurchaseInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const { data: departments } = useQuery({
    queryKey: ["depts-simple", currentTenant?.id],
    enabled: !!currentTenant?.id && open,
    queryFn: async (): Promise<DeptOption[]> => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("tenant_id", currentTenant!.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as DeptOption[];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id || !user) throw new Error("Sem tenant/usuário");
      if (!form.item.trim()) throw new Error("Item é obrigatório");
      if (!form.justification.trim()) throw new Error("Justificativa é obrigatória");
      const payload: PurchaseInput = {
        ...form,
        estimated_value: form.estimated_value == null || (form.estimated_value as unknown) === "" ? null : Number(form.estimated_value),
        quantity: Number(form.quantity) || 1,
        needed_by: form.needed_by || null,
        department_id: form.department_id || null,
        supplier_suggestion: form.supplier_suggestion || null,
      };
      return initial
        ? updatePurchaseRequest(initial.id, payload)
        : createPurchaseRequest(currentTenant.id, user.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) setForm(fromInitial(initial));
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar solicitação" : "Nova solicitação"}</DialogTitle>
          <DialogDescription>
            Descreva o item e a justificativa para aprovação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Item *</Label>
              <Input value={form.item} onChange={(e) => update("item", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade *</Label>
              <Input type="number" min={1} value={form.quantity}
                onChange={(e) => update("quantity", Number(e.target.value) || 1)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Valor estimado (R$)</Label>
              <Input type="number" step="0.01" min={0}
                value={form.estimated_value ?? ""}
                onChange={(e) => update("estimated_value", e.target.value === "" ? null : Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Urgência</Label>
              <Select value={form.urgency} onValueChange={(v) => update("urgency", v as PurchaseUrgency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Necessário até</Label>
              <Input type="date" value={form.needed_by ?? ""}
                onChange={(e) => update("needed_by", e.target.value || null)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Departamento</Label>
              <Select value={form.department_id || "_none"}
                onValueChange={(v) => update("department_id", v === "_none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Nenhum —</SelectItem>
                  {(departments ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Sugestão de fornecedor</Label>
              <Input value={form.supplier_suggestion ?? ""}
                onChange={(e) => update("supplier_suggestion", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Justificativa *</Label>
              <Textarea rows={4} value={form.justification}
                onChange={(e) => update("justification", e.target.value)} required />
            </div>
          </div>
          {mut.error && (
            <Alert variant="destructive">
              <AlertDescription>{(mut.error as Error).message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function fromInitial(p: PurchaseRequestRow | null): PurchaseInput {
  return {
    item: p?.item ?? "",
    justification: p?.justification ?? "",
    quantity: p?.quantity ?? 1,
    estimated_value: p?.estimated_value ?? null,
    supplier_suggestion: p?.supplier_suggestion ?? null,
    urgency: p?.urgency ?? "normal",
    department_id: p?.department_id ?? null,
    needed_by: p?.needed_by ?? null,
  };
}
