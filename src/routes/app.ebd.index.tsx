import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, GraduationCap, Users, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  listClasses, createClass, updateClass, deleteClass,
  type EbdClassWithRefs, type EbdClassInput,
} from "@/lib/ebd";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/ebd/")({
  head: () => ({ meta: [{ title: "EBD — Classes" }] }),
  component: EbdClassesPage,
});

function EbdClassesPage() {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EbdClassWithRefs | null>(null);
  const [deleting, setDeleting] = useState<EbdClassWithRefs | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ebd-classes", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => listClasses(currentTenant!.id),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebd-classes"] });
      setDeleting(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Escola Bíblica Dominical</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie classes, professores e a chamada de cada domingo.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova classe
        </Button>
      </div>

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
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-md border p-12 text-center">
          <GraduationCap className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma classe cadastrada. Clique em "Nova classe" para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.map((c) => (
            <Card key={c.id} className={!c.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 truncate">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      {c.name}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {c.age_range || "Sem faixa etária"}{c.room ? ` • Sala ${c.room}` : ""}
                    </CardDescription>
                  </div>
                  {!c.is_active && <Badge variant="outline">Inativa</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-muted-foreground">
                  <b className="text-foreground">Professor:</b> {c.teacher?.full_name ?? "—"}
                </div>
                <Link
                  to="/app/ebd/$classId"
                  params={{ classId: c.id }}
                  className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Chamada e alunos</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(c)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClassDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        initial={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir classe</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleting?.name}"?
              Todos os registros de presença desta classe serão removidos.
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

type MemberOption = { id: string; full_name: string };

function ClassDialog({
  open, onOpenChange, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: EbdClassWithRefs | null;
}) {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);

  const [form, setForm] = useState<EbdClassInput>(() => fromInitial(initial));
  function update<K extends keyof EbdClassInput>(key: K, value: EbdClassInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const { data: members } = useQuery({
    queryKey: ["members-simple", currentTenant?.id],
    enabled: !!currentTenant?.id && open,
    queryFn: async (): Promise<MemberOption[]> => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .eq("tenant_id", currentTenant!.id)
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as MemberOption[];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error("Sem tenant ativo");
      if (!form.name?.trim()) throw new Error("Nome é obrigatório");
      return initial
        ? updateClass(initial.id, form)
        : createClass(currentTenant.id, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebd-classes"] });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar classe" : "Nova classe"}</DialogTitle>
          <DialogDescription>
            Defina a classe da EBD e o professor responsável.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Faixa etária</Label>
              <Input placeholder="Ex: 7-10 anos" value={form.age_range ?? ""}
                onChange={(e) => update("age_range", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sala</Label>
              <Input value={form.room ?? ""} onChange={(e) => update("room", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Professor</Label>
            <Select value={form.teacher_id || "_none"}
              onValueChange={(v) => update("teacher_id", v === "_none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Nenhum —</SelectItem>
                {(members ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {initial && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active ?? true}
                onChange={(e) => update("is_active", e.target.checked)} />
              Ativa
            </label>
          )}
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

function fromInitial(c: EbdClassWithRefs | null): EbdClassInput {
  return {
    name: c?.name ?? "",
    age_range: c?.age_range ?? null,
    teacher_id: c?.teacher_id ?? null,
    room: c?.room ?? null,
    is_active: c?.is_active ?? true,
  };
}
