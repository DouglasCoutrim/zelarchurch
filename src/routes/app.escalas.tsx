import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Users, MapPin, CalendarDays, Clock,
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
  listSchedules, createSchedule, updateSchedule, deleteSchedule,
  type ScheduleInput, type ScheduleWithMeta,
} from "@/lib/schedules";
import { listDepartments } from "@/lib/departments";
import { useTenantStore } from "@/stores/tenantStore";
import { ScheduleMembersDialog } from "@/components/ScheduleMembersDialog";
import { ScheduleGeneratorDialog } from "@/components/ScheduleGeneratorDialog";
import { sendSchedule } from "@/lib/scheduleGenerator";
import { Send } from "lucide-react";

export const Route = createFileRoute("/app/escalas")({
  head: () => ({ meta: [{ title: "Escalas" }] }),
  component: SchedulesPage,
});

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}
function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}
function startOfMonthISO(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function endOfNextMonthsISO(months = 3, d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth() + months, 0, 23, 59, 59).toISOString();
}

function SchedulesPage() {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);

  const [from, setFrom] = useState<string>(() => startOfMonthISO().slice(0, 10));
  const [to, setTo] = useState<string>(() => endOfNextMonthsISO(3).slice(0, 10));
  const [departmentId, setDepartmentId] = useState<string>("all");

  const [editing, setEditing] = useState<ScheduleWithMeta | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ScheduleWithMeta | null>(null);
  const [linkOpen, setLinkOpen] = useState<ScheduleWithMeta | null>(null);

  const departmentsQ = useQuery({
    queryKey: ["departments", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: () => listDepartments(tenant!.id),
  });

  const list = useQuery({
    queryKey: ["schedules", tenant?.id, { from, to, departmentId }],
    enabled: !!tenant?.id,
    queryFn: () =>
      listSchedules(tenant!.id, {
        from: `${from}T00:00:00`,
        to: `${to}T23:59:59`,
        departmentId: departmentId === "all" ? null : departmentId,
      }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      setDeleting(null);
    },
  });

  const groups = useMemo(() => {
    const map = new Map<string, ScheduleWithMeta[]>();
    for (const s of list.data ?? []) {
      const d = new Date(s.starts_at);
      const key = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [list.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Escalas</h1>
          <p className="text-sm text-muted-foreground">
            Organize cultos, ensaios e eventos com a equipe escalada.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova escala
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Departamento</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(departmentsQ.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : list.error ? (
        <p className="text-sm text-destructive">Erro ao carregar escalas.</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma escala no período.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([month, items]) => (
            <div key={month} className="space-y-3">
              <h2 className="text-sm font-medium capitalize text-muted-foreground">
                {month}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((s) => (
                  <ScheduleCard
                    key={s.id} schedule={s}
                    onEdit={() => setEditing(s)}
                    onDelete={() => setDeleting(s)}
                    onMembers={() => setLinkOpen(s)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ScheduleDialog
        open={creating || !!editing}
        initial={editing}
        departments={departmentsQ.data ?? []}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      {linkOpen && (
        <ScheduleMembersDialog
          open={!!linkOpen}
          onClose={() => setLinkOpen(null)}
          scheduleId={linkOpen.id}
          scheduleTitle={linkOpen.title}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir escala?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a escala e seus participantes.
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

function ScheduleCard({
  schedule, onEdit, onDelete, onMembers,
}: {
  schedule: ScheduleWithMeta;
  onEdit: () => void;
  onDelete: () => void;
  onMembers: () => void;
}) {
  const start = new Date(schedule.starts_at);
  const end = new Date(schedule.ends_at);
  const fmtDate = start.toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short",
  });
  const fmtTime = `${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{schedule.title}</CardTitle>
            {schedule.event_type && (
              <p className="text-xs text-muted-foreground">{schedule.event_type}</p>
            )}
          </div>
          {schedule.department && (
            <Badge variant="outline">{schedule.department.name}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2 capitalize text-muted-foreground">
            <CalendarDays className="h-4 w-4" /> {fmtDate}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" /> {fmtTime}
          </p>
          {schedule.location && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {schedule.location}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {schedule.confirmed_count}/{schedule.member_count} confirmados
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={onMembers}>
              <Users className="mr-1 h-4 w-4" /> Equipe
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleDialog({
  open, initial, departments, onClose,
}: {
  open: boolean;
  initial: ScheduleWithMeta | null;
  departments: { id: string; name: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);
  const key = initial?.id ?? "new";

  const [form, setForm] = useState<ScheduleInput>(() => ({
    title: initial?.title ?? "",
    event_type: initial?.event_type ?? "",
    location: initial?.location ?? "",
    department_id: initial?.department_id ?? null,
    starts_at: initial?.starts_at ?? new Date().toISOString(),
    ends_at:
      initial?.ends_at ??
      new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
    notes: initial?.notes ?? "",
  }));

  function set<K extends keyof ScheduleInput>(k: K, v: ScheduleInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: ScheduleInput = {
        ...form,
        event_type: form.event_type?.trim() || null,
        location: form.location?.trim() || null,
        notes: form.notes?.trim() || null,
        department_id: form.department_id || null,
      };
      if (initial) return updateSchedule(initial.id, payload);
      return createSchedule(tenant!.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      onClose();
    },
  });

  return (
    <Dialog key={key} open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar escala" : "Nova escala"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Culto de domingo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Input
                value={form.event_type ?? ""}
                onChange={(e) => set("event_type", e.target.value)}
                placeholder="Culto, ensaio..."
              />
            </div>
            <div className="space-y-1">
              <Label>Departamento</Label>
              <Select
                value={form.department_id ?? "none"}
                onValueChange={(v) => set("department_id", v === "none" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem departamento</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Início</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.starts_at)}
                onChange={(e) => set("starts_at", fromLocalInput(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Fim</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.ends_at)}
                onChange={(e) => set("ends_at", fromLocalInput(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Local</Label>
            <Input
              value={form.location ?? ""}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Templo principal"
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
              !form.title.trim() ||
              new Date(form.ends_at) <= new Date(form.starts_at)
            }
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
