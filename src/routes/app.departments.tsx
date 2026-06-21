import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Pencil, Trash2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  type DepartmentWithCount,
} from "@/lib/departments";
import { useTenantStore } from "@/stores/tenantStore";
import { usePlanLimit } from "@/hooks/usePlanLimit";
import { DepartmentMembersDialog } from "@/components/DepartmentMembersDialog";

export const Route = createFileRoute("/app/departments")({
  head: () => ({ meta: [{ title: "Departamentos" }] }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const { canAddDepartment, usage } = usePlanLimit(currentTenant?.id);

  const [editing, setEditing] = useState<DepartmentWithCount | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<DepartmentWithCount | null>(null);
  const [linkOpen, setLinkOpen] = useState<DepartmentWithCount | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["departments", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => listDepartments(currentTenant!.id),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
      setDeleting(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Departamentos</h1>
          <p className="text-sm text-muted-foreground">
            {usage
              ? `${usage.currentDepartments} de ${usage.maxDepartments} departamentos usados`
              : "Organize os ministérios e equipes da sua igreja."}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!canAddDepartment}
          title={!canAddDepartment ? "Limite do plano atingido" : undefined}>
          <Plus className="mr-1 h-4 w-4" />
          Novo departamento
        </Button>
      </div>

      {!canAddDepartment && usage && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Limite do plano atingido</AlertTitle>
          <AlertDescription>
            Você atingiu o limite de {usage.maxDepartments} departamentos.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((d) => (
            <Card key={d.id} className={!d.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{d.name}</CardTitle>
                    {d.description && (
                      <CardDescription className="line-clamp-2">{d.description}</CardDescription>
                    )}
                  </div>
                  {!d.is_active && <Badge variant="outline">Inativo</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <button onClick={() => setLinkOpen(d)}
                  className="flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm hover:bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{d.member_count} {d.member_count === 1 ? "membro" : "membros"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">Gerenciar →</span>
                </button>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(d)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum departamento ainda. Clique em "Novo departamento" para começar.
          </p>
        </div>
      )}

      <DepartmentDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        initial={editing}
      />

      <DepartmentMembersDialog
        open={!!linkOpen}
        onOpenChange={(v) => { if (!v) setLinkOpen(null); }}
        departmentId={linkOpen?.id ?? null}
        departmentName={linkOpen?.name ?? ""}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir departamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleting?.name}"?
              Os vínculos com membros serão removidos. Esta ação não pode ser desfeita.
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

function DepartmentDialog({
  open, onOpenChange, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: DepartmentWithCount | null;
}) {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  // Reset on open
  useState(() => {
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setIsActive(initial?.is_active ?? true);
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error("Sem tenant ativo");
      if (!name.trim()) throw new Error("Nome é obrigatório");
      return initial
        ? updateDepartment(initial.id, { name, description: description || null, is_active: isActive })
        : createDepartment(currentTenant.id, { name, description: description || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setName(initial?.name ?? "");
          setDescription(initial?.description ?? "");
          setIsActive(initial?.is_active ?? true);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar departamento" : "Novo departamento"}</DialogTitle>
          <DialogDescription>
            {initial ? "Atualize os dados do departamento." : "Crie um novo ministério ou equipe."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>
          {initial && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)} />
              Ativo
            </label>
          )}
          {mut.error && (
            <Alert variant="destructive">
              <AlertDescription>{(mut.error as Error).message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
