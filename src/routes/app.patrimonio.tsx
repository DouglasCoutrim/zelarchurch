import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, Package, DollarSign, MapPin } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  listPatrimonies, createPatrimony, updatePatrimony, deletePatrimony, summarize,
  ASSET_CONDITION_OPTIONS, type Patrimony, type PatrimonyInput,
} from "@/lib/patrimony";
import { useTenantStore } from "@/stores/tenantStore";
import { ImageUploadField } from "@/components/ImageUploadField";

export const Route = createFileRoute("/app/patrimonio")({
  head: () => ({ meta: [{ title: "Patrimônio" }] }),
  component: PatrimonyPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PatrimonyPage() {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [condition, setCondition] = useState<string>("all");
  const [editing, setEditing] = useState<Patrimony | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Patrimony | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["patrimonies", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => listPatrimonies(currentTenant!.id),
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (category !== "all") list = list.filter((p) => (p.category ?? "—") === category);
    if (condition !== "all") list = list.filter((p) => (p.condition ?? "") === condition);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.serial_number ?? "").toLowerCase().includes(s) ||
          (p.location ?? "").toLowerCase().includes(s) ||
          (p.category ?? "").toLowerCase().includes(s),
      );
    }
    return list;
  }, [data, category, condition, search]);

  const summary = useMemo(() => summarize(data ?? []), [data]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((p) => set.add(p.category ?? "Sem categoria"));
    return Array.from(set).sort();
  }, [data]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePatrimony(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patrimonies"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Patrimônio"
        description="Controle de bens, equipamentos e itens da igreja."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Novo item
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Package className="h-4 w-4" />} label="Itens cadastrados" value={String(summary.total)} />
        <SummaryCard icon={<DollarSign className="h-4 w-4" />} label="Valor total" value={BRL(summary.totalValue)} />
        <SummaryCard icon={<MapPin className="h-4 w-4" />} label="Categorias" value={String(summary.byCategory.length)} />
        <SummaryCard
          icon={<Package className="h-4 w-4" />}
          label="Em bom estado"
          value={String((summary.byCondition["novo"] ?? 0) + (summary.byCondition["bom"] ?? 0))}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Itens</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nome, série, local..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estados</SelectItem>
                {ASSET_CONDITION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-md border p-12 text-center text-sm text-muted-foreground">
              Nenhum item encontrado. Clique em "Novo item" para começar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const value = Number(p.current_value ?? p.acquisition_value ?? 0);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          {p.serial_number && (
                            <div className="text-xs text-muted-foreground">S/N: {p.serial_number}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{p.category ?? "—"}</TableCell>
                        <TableCell className="text-sm">{p.location ?? "—"}</TableCell>
                        <TableCell>
                          {p.condition ? (
                            <Badge variant="outline">
                              {ASSET_CONDITION_OPTIONS.find((o) => o.value === p.condition)?.label ?? p.condition}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{value ? BRL(value) : "—"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleting(p)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PatrimonyDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        initial={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleting?.name}"? Esta ação pode ser desfeita por um administrador.
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

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function PatrimonyDialog({
  open, onOpenChange, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Patrimony | null;
}) {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);

  const [form, setForm] = useState<PatrimonyInput>(() => fromInitial(initial));

  function reset(p: Patrimony | null) { setForm(fromInitial(p)); }

  const mut = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error("Sem tenant ativo");
      if (!form.name?.trim()) throw new Error("Nome é obrigatório");
      const payload: PatrimonyInput = {
        ...form,
        acquisition_value: form.acquisition_value === null || form.acquisition_value === undefined || (form.acquisition_value as unknown) === "" ? null : Number(form.acquisition_value),
        current_value: form.current_value === null || form.current_value === undefined || (form.current_value as unknown) === "" ? null : Number(form.current_value),
        acquisition_date: form.acquisition_date || null,
        warranty_until: form.warranty_until || null,
      };
      return initial
        ? updatePatrimony(initial.id, payload)
        : createPatrimony(currentTenant.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patrimonies"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function update<K extends keyof PatrimonyInput>(key: K, value: PatrimonyInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) reset(initial);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>
            Cadastre informações detalhadas do bem ou equipamento.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat">Categoria</Label>
              <Input id="cat" placeholder="Ex: Som, Vídeo, Mobiliário"
                value={form.category ?? ""} onChange={(e) => update("category", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serial">Número de série</Label>
              <Input id="serial" value={form.serial_number ?? ""}
                onChange={(e) => update("serial_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc">Localização</Label>
              <Input id="loc" placeholder="Ex: Sala de som, Templo"
                value={form.location ?? ""} onChange={(e) => update("location", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cond">Estado de conservação</Label>
              <Select value={form.condition ?? ""} onValueChange={(v) => update("condition", v || null)}>
                <SelectTrigger id="cond"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ASSET_CONDITION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acq_date">Data de aquisição</Label>
              <Input id="acq_date" type="date" value={form.acquisition_date ?? ""}
                onChange={(e) => update("acquisition_date", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warr">Garantia até</Label>
              <Input id="warr" type="date" value={form.warranty_until ?? ""}
                onChange={(e) => update("warranty_until", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acq_val">Valor de aquisição (R$)</Label>
              <Input id="acq_val" type="number" step="0.01" min="0"
                value={form.acquisition_value ?? ""}
                onChange={(e) => update("acquisition_value", e.target.value === "" ? null : Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cur_val">Valor atual (R$)</Label>
              <Input id="cur_val" type="number" step="0.01" min="0"
                value={form.current_value ?? ""}
                onChange={(e) => update("current_value", e.target.value === "" ? null : Number(e.target.value))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="supp">Fornecedor</Label>
              <Input id="supp" value={form.supplier ?? ""}
                onChange={(e) => update("supplier", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <ImageUploadField
                label="Foto do item"
                value={form.photo_url}
                onChange={(v) => update("photo_url", v)}
                maxSize={1024}
                shape="wide"
              />
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

function fromInitial(p: Patrimony | null): PatrimonyInput {
  return {
    name: p?.name ?? "",
    category: p?.category ?? null,
    serial_number: p?.serial_number ?? null,
    acquisition_date: p?.acquisition_date ?? null,
    acquisition_value: p?.acquisition_value ?? null,
    current_value: p?.current_value ?? null,
    condition: p?.condition ?? null,
    location: p?.location ?? null,
    supplier: p?.supplier ?? null,
    warranty_until: p?.warranty_until ?? null,
    photo_url: p?.photo_url ?? null,
  };
}
