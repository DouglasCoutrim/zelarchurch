import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  listAccounts, createAccount, updateAccount, deleteAccount,
  type AccountType, type ChartAccount,
} from "@/lib/finance";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/financeiro/contas")({
  component: AccountsPage,
});

function AccountsPage() {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);
  const [editing, setEditing] = useState<ChartAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ChartAccount | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: () => listAccounts(tenant!.id),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setDeleting(null);
    },
  });

  const receitas = (data ?? []).filter((a) => a.type === "receita");
  const despesas = (data ?? []).filter((a) => a.type === "despesa");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Organize categorias de receitas e despesas para classificar seus lançamentos.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova conta
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">Erro ao carregar contas.</p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <AccountTable
            title="Receitas"
            tone="receita"
            rows={receitas}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
          <AccountTable
            title="Despesas"
            tone="despesa"
            rows={despesas}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        </div>
      )}

      <AccountDialog
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
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Lançamentos vinculados ficarão sem
              classificação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && delMut.mutate(deleting.id)}
              disabled={delMut.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AccountTable({
  title, tone, rows, onEdit, onDelete,
}: {
  title: string;
  tone: AccountType;
  rows: ChartAccount[];
  onEdit: (a: ChartAccount) => void;
  onDelete: (a: ChartAccount) => void;
}) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-medium">{title}</h2>
        <Badge variant={tone === "receita" ? "default" : "secondary"}>
          {rows.length}
        </Badge>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nenhuma conta cadastrada.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.code}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell>
                  <Badge variant={a.is_active ? "outline" : "secondary"}>
                    {a.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(a)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function AccountDialog({
  open, initial, onClose,
}: {
  open: boolean;
  initial: ChartAccount | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "receita");
  const [active, setActive] = useState<boolean>(initial?.is_active ?? true);

  // re-sync when initial changes
  const key = initial?.id ?? "new";

  const saveMut = useMutation({
    mutationFn: async () => {
      if (initial) {
        return updateAccount(initial.id, { code, name, type, is_active: active });
      }
      return createAccount(tenant!.id, { code, name, type });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
  });

  return (
    <Dialog
      key={key}
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar conta" : "Nova conta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Código</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="1.01"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dízimos"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {initial && (
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={active ? "true" : "false"}
                onValueChange={(v) => setActive(v === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativa</SelectItem>
                  <SelectItem value="false">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {saveMut.error && (
            <p className="text-sm text-destructive">
              {(saveMut.error as Error).message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !code.trim() || !name.trim()}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
