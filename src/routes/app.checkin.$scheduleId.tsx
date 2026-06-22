import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, CheckCircle2, MapPin, Navigation, Search, Undo2, UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getScheduleForCheckin, listParticipantsForCheckin,
  searchMembersForCheckin, checkInMember, undoCheckIn,
  geoCheckIn, getCurrentPosition,
  type CheckinParticipant,
} from "@/lib/checkins";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/checkin/$scheduleId")({
  component: CheckinScreen,
});

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function CheckinScreen() {
  const { scheduleId } = Route.useParams();
  const tenant = useTenantStore((s) => s.currentTenant);
  const qc = useQueryClient();

  const scheduleQ = useQuery({
    queryKey: ["checkin-schedule", scheduleId],
    queryFn: () => getScheduleForCheckin(scheduleId),
  });

  const participantsQ = useQuery({
    queryKey: ["checkin-participants", scheduleId],
    enabled: !!tenant?.id,
    queryFn: () => listParticipantsForCheckin(tenant!.id, scheduleId),
    refetchInterval: 15_000,
  });

  const [filter, setFilter] = useState("");
  const [guestTerm, setGuestTerm] = useState("");
  const [guestDebounced, setGuestDebounced] = useState("");
  const [showGuest, setShowGuest] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGuestDebounced(guestTerm), 250);
    return () => clearTimeout(t);
  }, [guestTerm]);

  const guestQ = useQuery({
    queryKey: ["checkin-guest", tenant?.id, guestDebounced],
    enabled: showGuest && !!tenant?.id,
    queryFn: () => searchMembersForCheckin(tenant!.id, guestDebounced),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["checkin-participants", scheduleId] });
    qc.invalidateQueries({ queryKey: ["checkin-upcoming"] });
  };

  const checkInMut = useMutation({
    mutationFn: (memberId: string) =>
      checkInMember({ tenantId: tenant!.id, scheduleId, memberId, method: "manual" }),
    onSuccess: invalidate,
  });
  const undoMut = useMutation({
    mutationFn: (memberId: string) => undoCheckIn(scheduleId, memberId),
    onSuccess: invalidate,
  });

  const geoMut = useMutation({
    mutationFn: async () => {
      const pos = await getCurrentPosition();
      return geoCheckIn(scheduleId, pos.coords.latitude, pos.coords.longitude);
    },
    onSuccess: (res) => {
      toast.success(`Check-in registrado a ${res.distance_meters} m da igreja.`);
      invalidate();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Erro ao registrar check-in";
      toast.error(msg);
    },
  });

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return participantsQ.data ?? [];
    return (participantsQ.data ?? []).filter((p) =>
      p.full_name.toLowerCase().includes(term),
    );
  }, [participantsQ.data, filter]);

  const presentCount = (participantsQ.data ?? []).filter((p) => p.checkin).length;
  const scheduledCount = (participantsQ.data ?? []).filter((p) => p.scheduled).length;

  const schedule = scheduleQ.data;
  const start = schedule ? new Date(schedule.starts_at) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/app/checkin">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {schedule?.title ?? "Check-in"}
          </h1>
          {schedule && start && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="capitalize">
                {start.toLocaleDateString("pt-BR", {
                  weekday: "long", day: "2-digit", month: "long",
                })}
              </span>
              <span>
                {start.toLocaleTimeString("pt-BR", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
              {schedule.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {schedule.location}
                </span>
              )}
              {schedule.department && (
                <Badge variant="outline">{schedule.department.name}</Badge>
              )}
            </p>
          )}
        </div>
        <Card className="px-4 py-2 text-center">
          <CardContent className="p-0">
            <div className="text-3xl font-semibold text-primary">
              {presentCount}
              <span className="text-base text-muted-foreground">/{scheduledCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">presentes</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative grow">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar na escala..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Button
          variant={showGuest ? "default" : "outline"}
          onClick={() => setShowGuest((v) => !v)}
        >
          <UserPlus className="mr-1 h-4 w-4" /> Avulso
        </Button>
      </div>

      {showGuest && (
        <Card>
          <CardContent className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground">
              Registre presença de um membro que não estava na escala.
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar membro..."
                value={guestTerm}
                onChange={(e) => setGuestTerm(e.target.value)}
              />
            </div>
            <div className="max-h-60 space-y-1 overflow-auto">
              {guestQ.isLoading ? (
                <Skeleton className="h-10" />
              ) : (guestQ.data ?? []).length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhum resultado.</p>
              ) : (
                (guestQ.data ?? []).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={m.photo_url ?? undefined} />
                        <AvatarFallback>{initials(m.full_name)}</AvatarFallback>
                      </Avatar>
                      <span>{m.full_name}</span>
                    </div>
                    <Button
                      size="sm" variant="outline"
                      disabled={checkInMut.isPending}
                      onClick={() => checkInMut.mutate(m.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {participantsQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum participante encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <ParticipantRow
              key={p.member_id}
              participant={p}
              onCheckIn={() => checkInMut.mutate(p.member_id)}
              onUndo={() => undoMut.mutate(p.member_id)}
              busy={checkInMut.isPending || undoMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ParticipantRow({
  participant: p, onCheckIn, onUndo, busy,
}: {
  participant: CheckinParticipant;
  onCheckIn: () => void;
  onUndo: () => void;
  busy: boolean;
}) {
  const present = !!p.checkin;
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 transition-colors ${present ? "border-emerald-300/60 bg-emerald-50/40" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={p.photo_url ?? undefined} />
          <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{p.full_name}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {p.role_in_schedule && <span>{p.role_in_schedule}</span>}
            {!p.scheduled && <Badge variant="secondary">Avulso</Badge>}
            {present && (
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                {new Date(p.checkin!.checked_in_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </div>
      {present ? (
        <Button size="sm" variant="ghost" disabled={busy} onClick={onUndo}>
          <Undo2 className="mr-1 h-4 w-4" /> Desfazer
        </Button>
      ) : (
        <Button size="sm" disabled={busy} onClick={onCheckIn}>
          <Check className="mr-1 h-4 w-4" /> Presente
        </Button>
      )}
    </div>
  );
}
