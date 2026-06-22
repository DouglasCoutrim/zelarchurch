import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Wallet, Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  listTransactions, createTransaction, updateTransaction, softDeleteTransaction,
  listAccounts, listCostCenters, getFinanceSummary,
  uploadReceipt, getReceiptUrl, removeReceipt,
  TRANSACTION_STATUS_OPTIONS,
  type TransactionInput, type TransactionRow, type TransactionStatus, type TransactionType,
} from "@/lib/finance";
import { useTenantStore } from "@/stores/tenantStore";
import { formatBRL } from "@/lib/plans";
import { listCongregations } from "@/lib/congregations";

export const Route = createFileRoute("/app/financeiro/")({
  component: TransactionsPage,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function TransactionsPage() {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);

  const [type, setType] = useState<TransactionType | "all">("all");
  const [status, setStatus] = useState<TransactionStatus | "all">("all");
  const [congregation, setCongregation] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<TransactionRow | null>(null);

  const congregationsQ = useQuery({
    queryKey: ["congregations", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: () => listCongregations(tenant!.id),
  });

  const congregationId = congregation === "all" ? null : congregation;

  const summary = useQuery({
    queryKey: ["finance-summary", tenant?.id, { congregationId }],
    enabled: !!tenant?.id,
    queryFn: () => getFinanceSummary(tenant!.id, undefined, undefined, congregationId),
  });

  const list = useQuery({
    queryKey: ["transactions", tenant?.id, { type, status, search, page, congregationId }],
    enabled: !!tenant?.id,
    queryFn: () =>
      listTransactions({
        tenantId: tenant!.id,
        type,
        status,
        search,
        page,
        pageSize,
        congregationId,
      }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => softDeleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      setDeleting(null);
      toast.success("Lançamento excluído");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir lançamento"),
  });

  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Receitas"
          value={summary.data?.receitas ?? 0}
          icon={<ArrowUpCircle className="h-5 w-5 text-emerald-600" />}
        />
        <SummaryCard
          label="Despesas"
          value={summary.data?.despesas ?? 0}
          icon={<ArrowDownCircle className="h-5 w-5 text-rose-600" />}
        />
        <SummaryCard
          label="Saldo"
          value={summary.data?.saldo ?? 0}
          icon={<Wallet className="h-5 w-5 text-primary" />}
        />
        <SummaryCard
          label="Pendente"
          value={summary.data?.pendente ?? 0}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="grow space-y-1">
          <Label>Buscar</Label>
          <Input
            placeholder="Descrição do lançamento"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => { setPage(1); setType(v as typeof type); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v as typeof status); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TRANSACTION_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Congregação</Label>
          <Select value={congregation} onValueChange={(v) => { setPage(1); setCongregation(v); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas (consolidado)</SelectItem>
              {(congregationsQ.data ?? [])
                .filter((c) => c.is_active)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo lançamento
        </Button>
      </div>

      <div className="rounded-lg border">
        {list.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : list.error ? (
          <p className="p-4 text-sm text-destructive">Erro ao carregar lançamentos.</p>
        ) : (list.data?.rows.length ?? 0) === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento encontrado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-32 text-right">Valor</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data!.rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(t.transaction_date).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{t.description}</div>
                    {t.cost_center?.name && (
                      <div className="text-xs text-muted-foreground">
                        {t.cost_center.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {t.account ? `${t.account.code} • ${t.account.name}` : "—"}
                  </TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell
                    className={`text-right font-mono ${t.type === "receita" ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {t.type === "receita" ? "+" : "-"} {formatBRL(Number(t.amount))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(t)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >Anterior</Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >Próxima</Button>
          </div>
        </div>
      )}

      <TransactionDialog
        open={creating || !!editing}
        initial={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O lançamento será removido do histórico financeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && delMut.mutate(deleting.id)}
              disabled={delMut.isPending}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({
  label, value, icon,
}: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{formatBRL(value)}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  const map: Record<TransactionStatus, { label: string; cls: string }> = {
    pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    pago: { label: "Pago", cls: "bg-rose-100 text-rose-800 hover:bg-rose-100" },
    recebido: { label: "Recebido", cls: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
    cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status];
  return <Badge className={m.cls} variant="secondary">{m.label}</Badge>;
}

function TransactionDialog({
  open, initial, onClose,
}: {
  open: boolean;
  initial: TransactionRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);
  const key = initial?.id ?? "new";

  const accountsQ = useQuery({
    queryKey: ["accounts", tenant?.id],
    enabled: !!tenant?.id && open,
    queryFn: () => listAccounts(tenant!.id),
  });
  const centersQ = useQuery({
    queryKey: ["cost-centers", tenant?.id],
    enabled: !!tenant?.id && open,
    queryFn: () => listCostCenters(tenant!.id),
  });

  const [form, setForm] = useState<TransactionInput>(() => ({
    type: initial?.type ?? "receita",
    status: initial?.status ?? "pendente",
    amount: Number(initial?.amount ?? 0),
    description: initial?.description ?? "",
    notes: initial?.notes ?? "",
    account_id: initial?.account_id ?? null,
    cost_center_id: initial?.cost_center_id ?? null,
    payment_method: initial?.payment_method ?? "",
    transaction_date: initial?.transaction_date ?? todayISO(),
    due_date: initial?.due_date ?? null,
  }));

  const filteredAccounts = useMemo(
    () => (accountsQ.data ?? []).filter((a) => a.type === form.type && a.is_active),
    [accountsQ.data, form.type],
  );

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removingReceipt, setRemovingReceipt] = useState(false);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: TransactionInput = {
        ...form,
        amount: Number(form.amount),
        notes: form.notes?.trim() ? form.notes : null,
        payment_method: form.payment_method?.trim() ? form.payment_method : null,
        account_id: form.account_id || null,
        cost_center_id: form.cost_center_id || null,
        due_date: form.due_date || null,
      };
      if (removingReceipt) payload.receipt_url = null;
      const saved = initial
        ? await updateTransaction(initial.id, payload)
        : await createTransaction(tenant!.id, payload);
      if (receiptFile) {
        if (initial?.receipt_url) await removeReceipt(initial.receipt_url).catch(() => {});
        const path = await uploadReceipt(tenant!.id, saved.id, receiptFile);
        await updateTransaction(saved.id, { receipt_url: path });
      } else if (removingReceipt && initial?.receipt_url) {
        await removeReceipt(initial.receipt_url).catch(() => {});
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      onClose();
      toast.success(initial ? "Lançamento atualizado" : "Lançamento criado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar lançamento"),
  });

  async function openReceipt() {
    if (!initial?.receipt_url) return;
    const url = await getReceiptUrl(initial.receipt_url);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function set<K extends keyof TransactionInput>(k: K, v: TransactionInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <Dialog key={key} open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar lançamento" : "Novo lançamento"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  set("type", v as TransactionType);
                  set("account_id", null);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as TransactionStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ex.: Dízimos do culto de domingo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.amount}
                onChange={(e) => set("amount", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.transaction_date}
                onChange={(e) => set("transaction_date", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Conta</Label>
            <Select
              value={form.account_id ?? "none"}
              onValueChange={(v) => set("account_id", v === "none" ? null : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem conta</SelectItem>
                {filteredAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} • {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(centersQ.data?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <Label>Centro de custo</Label>
              <Select
                value={form.cost_center_id ?? "none"}
                onValueChange={(v) => set("cost_center_id", v === "none" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem centro</SelectItem>
                  {(centersQ.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Forma de pagamento</Label>
            <Input
              value={form.payment_method ?? ""}
              onChange={(e) => set("payment_method", e.target.value)}
              placeholder="PIX, dinheiro, cartão..."
            />
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Comprovante</Label>
            {initial?.receipt_url && !removingReceipt && !receiptFile && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-sm">
                <span className="flex-1 truncate text-muted-foreground">
                  Comprovante anexado
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={openReceipt}>
                  Ver
                </Button>
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => setRemovingReceipt(true)}
                >
                  Remover
                </Button>
              </div>
            )}
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
            {receiptFile && (
              <p className="text-xs text-muted-foreground">
                Novo arquivo: {receiptFile.name}
              </p>
            )}
          </div>
          {saveMut.error && (
            <p className="text-sm text-destructive">
              {(saveMut.error as Error).message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={
              saveMut.isPending ||
              !form.description.trim() ||
              !form.amount ||
              form.amount <= 0
            }
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
