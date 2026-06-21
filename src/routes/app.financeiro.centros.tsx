import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  listCostCenters, createCostCenter, updateCostCenter, deleteCostCenter,
  type CostCenter,
} from "@/lib/finance";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/financeiro/centros")({
  component: CostCentersPage,
});

function CostCentersPage() {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CostCenter | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["cost-centers", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: () => listCostCenters(tenant!.id),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCostCenter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-centers"] });
      setDeleting(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Agrupe lançamentos por área (ex.: louvor, missões, obras) para análises mais ricas.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo centro
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">Erro ao carregar centros.</p>}

      <div className="rounded-lg border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum centro de custo cadastrado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? "outline" : "secondary"}>
                      {c.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CostCenterDialog
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
            <AlertDialogTitle>Excluir centro?</AlertDialogTitle>
            <AlertDialogDescription>
              Lançamentos vinculados ficarão sem centro de custo.
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

function CostCenterDialog({
  open, initial, onClose,
}: { open: boolean; initial: CostCenter | null; onClose: () => void }) {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);
  const key = initial?.id ?? "new";
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [active, setActive] = useState<boolean>(initial?.is_active ?? true);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { name, description: description.trim() || null };
      if (initial) {
        return updateCostCenter(initial.id, { ...payload, is_active: active });
      }
      return createCostCenter(tenant!.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-centers"] });
      onClose();
    },
  });

  return (
    <Dialog key={key} open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar centro" : "Novo centro de custo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {initial && (
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={active ? "true" : "false"}
                onValueChange={(v) => setActive(v === "true")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
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
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !name.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
