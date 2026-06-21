import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Calendar, Check, Search, Plus, Trash2, GraduationCap, TrendingUp,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  getClass, listClassStudents, getAttendanceForDate, setAttendance,
  getClassStats, removeAttendance,
} from "@/lib/ebd";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/ebd/$classId")({
  head: () => ({ meta: [{ title: "EBD — Classe" }] }),
  component: ClassDetailPage,
});

function todayIso() { return new Date().toISOString().slice(0, 10); }
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function ClassDetailPage() {
  const { classId } = Route.useParams();
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [date, setDate] = useState(todayIso());
  const [addOpen, setAddOpen] = useState(false);

  const { data: cls, isLoading: clsLoading } = useQuery({
    queryKey: ["ebd-class", classId],
    queryFn: () => getClass(classId),
  });
  const { data: students, isLoading: stuLoading } = useQuery({
    queryKey: ["ebd-students", currentTenant?.id, classId],
    enabled: !!currentTenant?.id,
    queryFn: () => listClassStudents(currentTenant!.id, classId),
  });
  const { data: attendance } = useQuery({
    queryKey: ["ebd-attendance", currentTenant?.id, classId, date],
    enabled: !!currentTenant?.id,
    queryFn: () => getAttendanceForDate(currentTenant!.id, classId, date),
  });
  const { data: stats } = useQuery({
    queryKey: ["ebd-stats", currentTenant?.id, classId],
    enabled: !!currentTenant?.id,
    queryFn: () => getClassStats(currentTenant!.id, classId),
  });

  const presentSet = useMemo(
    () => new Set((attendance ?? []).filter((a) => a.is_present).map((a) => a.student_id)),
    [attendance],
  );

  const setMut = useMutation({
    mutationFn: (input: { studentId: string; isPresent: boolean }) =>
      setAttendance({
        tenantId: currentTenant!.id,
        classId, date,
        studentId: input.studentId,
        isPresent: input.isPresent,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebd-attendance", currentTenant?.id, classId, date] });
      queryClient.invalidateQueries({ queryKey: ["ebd-students", currentTenant?.id, classId] });
      queryClient.invalidateQueries({ queryKey: ["ebd-stats", currentTenant?.id, classId] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (studentId: string) => removeAttendance(classId, studentId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebd-attendance", currentTenant?.id, classId, date] });
    },
  });

  const presentCount = presentSet.size;
  const totalStudents = students?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link to="/app/ebd"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            {clsLoading ? "Carregando..." : cls?.name}
          </h1>
          {cls && (
            <p className="text-sm text-muted-foreground">
              {cls.age_range || "Sem faixa etária"}
              {cls.room ? ` • Sala ${cls.room}` : ""}
              {cls.teacher?.full_name ? ` • Prof. ${cls.teacher.full_name}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">Data da chamada</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar aluno
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Alunos cadastrados" value={String(totalStudents)} />
        <Kpi label="Presentes hoje" value={`${presentCount} / ${totalStudents}`} />
        <Kpi
          label="Frequência geral"
          value={stats ? `${Math.round(stats.presence_rate * 100)}%` : "—"}
          hint={stats?.last_date ? `Última chamada: ${new Date(stats.last_date).toLocaleDateString("pt-BR")}` : undefined}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" /> Chamada de {new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stuLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (students?.length ?? 0) === 0 ? (
            <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
              Nenhum aluno ainda. Use "Adicionar aluno" para incluir membros nesta classe.
            </div>
          ) : (
            <div className="space-y-2">
              {students!.map((s) => {
                const present = presentSet.has(s.member_id);
                const rec = (attendance ?? []).find((a) => a.student_id === s.member_id);
                return (
                  <div key={s.member_id}
                    className="flex items-center justify-between gap-3 rounded-md border p-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={s.photo_url ?? undefined} />
                        <AvatarFallback>{initials(s.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.total_present} presenças
                          {s.last_present_at ? ` • última em ${new Date(s.last_present_at).toLocaleDateString("pt-BR")}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {present && <Badge>Presente</Badge>}
                      <Button
                        size="sm"
                        variant={present ? "default" : "outline"}
                        onClick={() => setMut.mutate({ studentId: s.member_id, isPresent: !present })}
                        disabled={setMut.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" /> {present ? "Presente" : "Marcar"}
                      </Button>
                      {rec && (
                        <Button size="sm" variant="ghost" onClick={() => removeMut.mutate(s.member_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddStudentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        classId={classId}
        date={date}
        excludeIds={new Set((students ?? []).map((s) => s.member_id))}
      />
    </div>
  );
}

function Kpi({
  label, value, hint, icon,
}: { label: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon} {label}
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function AddStudentDialog({
  open, onOpenChange, classId, date, excludeIds,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classId: string;
  date: string;
  excludeIds: Set<string>;
}) {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["ebd-add-search", currentTenant?.id, search],
    enabled: !!currentTenant?.id && open,
    queryFn: async (): Promise<{ id: string; full_name: string }[]> => {
      let q = supabase
        .from("members")
        .select("id, full_name")
        .eq("tenant_id", currentTenant!.id)
        .is("deleted_at", null)
        .order("full_name")
        .limit(20);
      if (search.trim()) q = q.ilike("full_name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async (studentId: string) => {
      await setAttendance({
        tenantId: currentTenant!.id,
        classId, date, studentId, isPresent: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebd-students"] });
      queryClient.invalidateQueries({ queryKey: ["ebd-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["ebd-stats"] });
    },
  });

  const filtered = (data ?? []).filter((m) => !excludeIds.has(m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar aluno</DialogTitle>
          <DialogDescription>
            O aluno será marcado como presente em {new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar membro..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        {error && (
          <Alert variant="destructive"><AlertTitle>Erro</AlertTitle>
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        )}
        <div className="max-h-[300px] space-y-1 overflow-y-auto">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)
            : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro disponível.</p>
            ) : filtered.map((m) => (
              <button
                key={m.id}
                className="flex w-full items-center justify-between rounded-md border p-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                onClick={() => addMut.mutate(m.id)}
                disabled={addMut.isPending}
              >
                <span>{m.full_name}</span>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
