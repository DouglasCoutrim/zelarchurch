import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  generateScheduleDraft, persistDraft, sendSchedule,
  type DraftDate, type GenerationParams,
} from "@/lib/scheduleGenerator";
import { useTenantStore } from "@/stores/tenantStore";

const DOW = [
  { v: 0, l: "Dom" }, { v: 1, l: "Seg" }, { v: 2, l: "Ter" },
  { v: 3, l: "Qua" }, { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" },
];

export function ScheduleGeneratorDialog({
  open, onClose, departments,
}: {
  open: boolean;
  onClose: () => void;
  departments: { id: string; name: string }[];
}) {
  const tenant = useTenantStore((s) => s.currentTenant);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [departmentId, setDepartmentId] = useState<string>(departments[0]?.id ?? "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [dow, setDow] = useState<number[]>([0]);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("21:00");
  const [title, setTitle] = useState("Culto");
  const [draft, setDraft] = useState<DraftDate[]>([]);
  const [summary, setSummary] = useState<{ memberId: string; memberName: string; count: number }[]>([]);
  const [scheduleIds, setScheduleIds] = useState<string[]>([]);

  const params = (): GenerationParams => ({
    tenantId: tenant!.id,
    departmentId,
    startDate, endDate,
    daysOfWeek: dow,
    startTime, endTime,
    title,
  });

  // membros disponíveis por instrumento (para troca manual)
  const memberPoolQ = useQuery({
    queryKey: ["instrument-players-pool", departmentId],
    enabled: !!departmentId && step === 2,
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("member_instruments")
        .select("instrument_id, member:members!inner(id, full_name)")
        .eq("is_active", true);
      type R = { instrument_id: string; member: { id: string; full_name: string } | { id: string; full_name: string }[] | null };
      const map = new Map<string, { id: string; full_name: string }[]>();
      for (const r of (data ?? []) as R[]) {
        const m = Array.isArray(r.member) ? r.member[0] : r.member;
        if (!m) continue;
        if (!map.has(r.instrument_id)) map.set(r.instrument_id, []);
        map.get(r.instrument_id)!.push(m);
      }
      return map;
    },
  });

  const genMut = useMutation({
    mutationFn: () => generateScheduleDraft(params()),
    onSuccess: (r) => {
      setDraft(r.draft); setSummary(r.summary); setStep(2);
    },
  });

  const saveMut = useMutation({
    mutationFn: () => persistDraft(params(), draft, title),
    onSuccess: (ids) => { setScheduleIds(ids); setStep(3); },
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      for (const id of scheduleIds) await sendSchedule(id);
    },
    onSuccess: onClose,
  });

  function swapMember(date: string, instrumentId: string, newMemberId: string) {
    setDraft((prev) => prev.map((d) => d.date !== date ? d : {
      ...d,
      assignments: d.assignments.map((a) => {
        if (a.instrumentId !== instrumentId) return a;
        const pool = memberPoolQ.data?.get(instrumentId) ?? [];
        const m = pool.find((p) => p.id === newMemberId);
        return { ...a, memberId: newMemberId, memberName: m?.full_name ?? "" };
      }),
      incomplete: d.assignments.every((a) => a.instrumentId === instrumentId ? !!newMemberId : !!a.memberId) ? false : d.incomplete,
    }));
  }

  function toggleDow(v: number) {
    setDow((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort());
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Gerar escala automática — Etapa {step}/3
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Departamento</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Título do evento</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dias da semana</Label>
              <div className="flex flex-wrap gap-2">
                {DOW.map((d) => (
                  <label key={d.v} className="flex items-center gap-1.5 rounded border px-2 py-1 text-sm">
                    <Checkbox checked={dow.includes(d.v)} onCheckedChange={() => toggleDow(d.v)} />
                    {d.l}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Horário início</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Horário fim</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            {genMut.error && <Alert variant="destructive"><AlertDescription>{(genMut.error as Error).message}</AlertDescription></Alert>}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => genMut.mutate()}
                disabled={!departmentId || !dow.length || genMut.isPending}
              >
                {genMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar sugestão
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {draft.length === 0 ? (
              <Alert><AlertDescription>Nenhuma data no intervalo selecionado.</AlertDescription></Alert>
            ) : (
              <>
                <div className="rounded-md border max-h-96 overflow-y-auto">
                  {draft.map((d) => (
                    <div key={d.date} className={`border-b p-3 ${d.incomplete ? "bg-destructive/5" : ""}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {new Date(d.startsAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                        </span>
                        {d.incomplete && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Incompleta
                          </Badge>
                        )}
                      </div>
                      <div className="grid gap-2">
                        {d.assignments.map((a) => {
                          const pool = memberPoolQ.data?.get(a.instrumentId) ?? [];
                          return (
                            <div key={a.instrumentId} className="flex items-center gap-2 text-sm">
                              <span className="w-32 text-muted-foreground">{a.instrumentName}</span>
                              <Select
                                value={a.memberId ?? "none"}
                                onValueChange={(v) => swapMember(d.date, a.instrumentId, v)}
                              >
                                <SelectTrigger className="flex-1 h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none" disabled>—</SelectItem>
                                  {pool.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <Label className="text-xs">Resumo de balanceamento</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {summary.map((s) => (
                      <Badge key={s.memberId} variant="secondary">{s.memberName}: {s.count}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            {saveMut.error && <Alert variant="destructive"><AlertDescription>{(saveMut.error as Error).message}</AlertDescription></Alert>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => saveMut.mutate()} disabled={!draft.length || saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aprovar e salvar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {scheduleIds.length} escala(s) criada(s) como aprovadas. Envie agora para notificar os membros.
              </AlertDescription>
            </Alert>
            {sendMut.error && <Alert variant="destructive"><AlertDescription>{(sendMut.error as Error).message}</AlertDescription></Alert>}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fechar</Button>
              <Button onClick={() => sendMut.mutate()} disabled={sendMut.isPending}>
                {sendMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar escala
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
