import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Check, UserMinus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import {
  findEligibleSubstitutes, requestSubstitution, respondSubstitution,
  escalateToLeader, listMyPendingSubstitutions,
} from "@/lib/substitutions";

export const Route = createFileRoute("/app/minhas-escalas")({
  head: () => ({ meta: [{ title: "Minhas escalas" }] }),
  component: MyScheduleView,
});

interface MyRow {
  schedule_id: string;
  member_id: string;
  confirmation: string | null;
  instrument_id: string | null;
  schedule: {
    id: string; title: string; starts_at: string; ends_at: string;
    location: string | null; status: string;
    department?: { name: string } | null;
  };
  role_in_schedule: string | null;
}

function MyScheduleView() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const tenant = useTenantStore((s) => s.currentTenant);
  const [subOpen, setSubOpen] = useState<MyRow | null>(null);

  // resolve member do usuário no tenant
  const memberQ = useQuery({
    queryKey: ["my-member", tenant?.id, user?.id],
    enabled: !!tenant?.id && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("members")
        .select("id, full_name")
        .eq("tenant_id", tenant!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { id: string; full_name: string } | null;
    },
  });

  const mineQ = useQuery({
    queryKey: ["my-schedules", memberQ.data?.id],
    enabled: !!memberQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_members")
        .select(
          "schedule_id, member_id, confirmation, instrument_id, role_in_schedule, schedule:schedules!inner(id, title, starts_at, ends_at, location, status, department:departments(name))",
        )
        .eq("member_id", memberQ.data!.id)
        .eq("schedule.status", "sent")
        .gte("schedule.starts_at", new Date().toISOString())
        .order("schedule(starts_at)", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => {
        const s = Array.isArray(r.schedule) ? r.schedule[0] : r.schedule;
        const dep = s?.department ? (Array.isArray(s.department) ? s.department[0] : s.department) : null;
        return { ...r, schedule: { ...s, department: dep } } as MyRow;
      });
    },
  });

  const pendingSubsQ = useQuery({
    queryKey: ["my-pending-subs", memberQ.data?.id],
    enabled: !!memberQ.data?.id,
    queryFn: () => listMyPendingSubstitutions(memberQ.data!.id),
  });

  const confirmMut = useMutation({
    mutationFn: async (row: MyRow) => {
      await supabase
        .from("schedule_members")
        .update({ confirmation: "confirmado", attended: true })
        .eq("schedule_id", row.schedule_id)
        .eq("member_id", row.member_id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-schedules"] }),
  });

  const respondMut = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      respondSubstitution(id, accept),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-pending-subs"] });
      qc.invalidateQueries({ queryKey: ["my-schedules"] });
    },
  });

  const upcoming = useMemo(() => mineQ.data ?? [], [mineQ.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minhas escalas</h1>
        <p className="text-sm text-muted-foreground">
          Suas próximas atividades e solicitações de substituição.
        </p>
      </div>

      {(pendingSubsQ.data ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Solicitações pendentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(pendingSubsQ.data ?? []).map((s) => {
              type R = { id: string; schedule?: { title: string; starts_at: string } | { title: string; starts_at: string }[]; requester?: { full_name: string } | { full_name: string }[] };
              const sub = s as R;
              const sch = Array.isArray(sub.schedule) ? sub.schedule[0] : sub.schedule;
              const req = Array.isArray(sub.requester) ? sub.requester[0] : sub.requester;
              return (
                <div key={sub.id} className="flex items-center justify-between border rounded-md p-3">
                  <div className="text-sm">
                    <p className="font-medium">{req?.full_name} pediu substituição</p>
                    <p className="text-muted-foreground text-xs">
                      {sch?.title} · {sch ? new Date(sch.starts_at).toLocaleString("pt-BR") : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => respondMut.mutate({ id: sub.id, accept: true })}>
                      Aceitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respondMut.mutate({ id: sub.id, accept: false })}>
                      Recusar
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {mineQ.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : upcoming.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma escala futura.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {upcoming.map((r) => {
            const start = new Date(r.schedule.starts_at);
            return (
              <Card key={r.schedule_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{r.schedule.title}</CardTitle>
                    {r.schedule.department && <Badge variant="outline">{r.schedule.department.name}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {start.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" /> {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {r.schedule.location && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {r.schedule.location}
                    </p>
                  )}
                  {r.role_in_schedule && <Badge variant="secondary">{r.role_in_schedule}</Badge>}
                  <div className="flex items-center justify-between border-t pt-3">
                    <Badge variant={r.confirmation === "confirmado" ? "default" : "outline"}>
                      {r.confirmation === "confirmado" ? "confirmado" : "pendente"}
                    </Badge>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => confirmMut.mutate(r)}>
                        <Check className="mr-1 h-4 w-4" /> Confirmar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSubOpen(r)}>
                        <UserMinus className="mr-1 h-4 w-4" /> Substituir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {subOpen && memberQ.data && tenant && (
        <SubstitutionDialog
          row={subOpen}
          memberId={memberQ.data.id}
          tenantId={tenant.id}
          onClose={() => setSubOpen(null)}
        />
      )}
    </div>
  );
}

function SubstitutionDialog({
  row, memberId, tenantId, onClose,
}: {
  row: MyRow;
  memberId: string;
  tenantId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [substituteId, setSubstituteId] = useState<string>("");
  const [reason, setReason] = useState("");

  const eligibleQ = useQuery({
    queryKey: ["eligible-subs", row.schedule_id, memberId],
    queryFn: () => findEligibleSubstitutes(row.schedule_id, memberId),
  });

  const submitMut = useMutation({
    mutationFn: () => requestSubstitution({
      tenantId, scheduleId: row.schedule_id,
      requesterMemberId: memberId, substituteMemberId: substituteId, reason,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-schedules"] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Solicitar substituição</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {eligibleQ.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (eligibleQ.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground space-y-3">
              <p>Nenhum membro disponível para o mesmo instrumento neste horário.</p>
              <Button variant="outline" size="sm" onClick={() => {
                // sem substituto: nada para criar; só notificar líder via uma sub "escalated"
                onClose();
              }}>Informar ao líder depois</Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Substituto</label>
                <div className="space-y-1">
                  {(eligibleQ.data ?? []).map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm border rounded p-2 cursor-pointer">
                      <input type="radio" name="sub" checked={substituteId === m.id} onChange={() => setSubstituteId(m.id)} />
                      {m.full_name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Motivo (opcional)</label>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => submitMut.mutate()} disabled={!substituteId || submitMut.isPending}>
            Enviar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// helper para usar em outra rota
export { escalateToLeader };
