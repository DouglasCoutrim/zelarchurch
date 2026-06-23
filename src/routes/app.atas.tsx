import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, FileText, Calendar, MapPin, Eye } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

import { supabase } from "@/integrations/supabase/client";
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
  listMinutes, createMinute, updateMinute, deleteMinute,
  MINUTE_STATUS_OPTIONS, MEETING_TYPES, asStringArray,
  type MinuteWithRefs, type MinuteInput, type MinuteStatus,
} from "@/lib/minutes";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/atas")({
  head: () => ({ meta: [{ title: "Atas" }] }),
  component: MinutesPage,
});

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function statusVariant(s: MinuteStatus): "default" | "secondary" | "outline" {
  if (s === "assinada") return "default";
  if (s === "aprovada") return "secondary";
  return "outline";
}

function MinutesPage() {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);

  const [editing, setEditing] = useState<MinuteWithRefs | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<MinuteWithRefs | null>(null);
  const [deleting, setDeleting] = useState<MinuteWithRefs | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["minutes", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => listMinutes(currentTenant!.id),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (statusFilter === "all") return list;
    return list.filter((m) => m.status === statusFilter);
  }, [data, statusFilter]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMinute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minutes"] });
      setDeleting(null);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governança"
        title="Atas"
        description="Registre e organize as atas das reuniões da igreja."
        actions={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {MINUTE_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-4 w-4" /> Nova ata
            </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border p-12 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma ata cadastrada. Clique em "Nova ata" para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((m) => (
            <Card key={m.id} className="transition hover:shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {m.meeting_type}
                      <Badge variant={statusVariant(m.status)}>
                        {MINUTE_STATUS_OPTIONS.find((o) => o.value === m.status)?.label}
                      </Badge>
                    </CardTitle>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDateTime(m.meeting_at)}
                      </span>
                      {m.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {m.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(m)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(m)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {m.president?.full_name && <span><b>Presidente:</b> {m.president.full_name}</span>}
                  {m.secretary?.full_name && <span><b>Secretário:</b> {m.secretary.full_name}</span>}
                  <span><b>Pauta:</b> {asStringArray(m.agenda).length} itens</span>
                  <span><b>Deliberações:</b> {asStringArray(m.deliberations).length}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MinuteDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        initial={editing}
      />

      <MinuteViewDialog
        open={!!viewing}
        onOpenChange={(v) => { if (!v) setViewing(null); }}
        minute={viewing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ata</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ata de "{deleting?.meeting_type}"?
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

// ---------- View Dialog ----------
function MinuteViewDialog({
  open, onOpenChange, minute,
}: { open: boolean; onOpenChange: (v: boolean) => void; minute: MinuteWithRefs | null }) {
  if (!minute) return null;
  const agenda = asStringArray(minute.agenda);
  const deliberations = asStringArray(minute.deliberations);
  const attendees = asStringArray(minute.attendees);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{minute.meeting_type}</DialogTitle>
          <DialogDescription>
            {formatDateTime(minute.meeting_at)}
            {minute.location ? ` — ${minute.location}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(minute.status)}>
              {MINUTE_STATUS_OPTIONS.find((o) => o.value === minute.status)?.label}
            </Badge>
            {minute.president?.full_name && (
              <Badge variant="outline">Presidente: {minute.president.full_name}</Badge>
            )}
            {minute.secretary?.full_name && (
              <Badge variant="outline">Secretário: {minute.secretary.full_name}</Badge>
            )}
          </div>
          {attendees.length > 0 && (
            <Section title={`Presentes (${attendees.length})`}>
              <ul className="list-disc pl-5">{attendees.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </Section>
          )}
          {agenda.length > 0 && (
            <Section title="Pauta">
              <ol className="list-decimal pl-5 space-y-1">{agenda.map((a, i) => <li key={i}>{a}</li>)}</ol>
            </Section>
          )}
          {minute.content && (
            <Section title="Conteúdo / Discussão">
              <p className="whitespace-pre-wrap">{minute.content}</p>
            </Section>
          )}
          {deliberations.length > 0 && (
            <Section title="Deliberações">
              <ul className="list-disc pl-5 space-y-1">{deliberations.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </Section>
          )}
          {minute.next_meeting_at && (
            <Section title="Próxima reunião">
              <p>{formatDateTime(minute.next_meeting_at)}</p>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

// ---------- Edit Dialog ----------
type MemberOption = { id: string; full_name: string };

function MinuteDialog({
  open, onOpenChange, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: MinuteWithRefs | null;
}) {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);

  const [meetingType, setMeetingType] = useState<string>(initial?.meeting_type ?? MEETING_TYPES[0]);
  const [meetingAt, setMeetingAt] = useState<string>(toLocalInput(initial?.meeting_at));
  const [nextAt, setNextAt] = useState<string>(toLocalInput(initial?.next_meeting_at ?? null));
  const [location, setLocation] = useState<string>(initial?.location ?? "");
  const [presidentId, setPresidentId] = useState<string>(initial?.president_id ?? "");
  const [secretaryId, setSecretaryId] = useState<string>(initial?.secretary_id ?? "");
  const [status, setStatus] = useState<MinuteStatus>(initial?.status ?? "rascunho");
  const [agendaText, setAgendaText] = useState<string>(asStringArray(initial?.agenda).join("\n"));
  const [attendeesText, setAttendeesText] = useState<string>(asStringArray(initial?.attendees).join("\n"));
  const [deliberationsText, setDeliberationsText] = useState<string>(asStringArray(initial?.deliberations).join("\n"));
  const [content, setContent] = useState<string>(initial?.content ?? "");

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

  function reset(m: MinuteWithRefs | null) {
    setMeetingType(m?.meeting_type ?? MEETING_TYPES[0]);
    setMeetingAt(toLocalInput(m?.meeting_at));
    setNextAt(toLocalInput(m?.next_meeting_at ?? null));
    setLocation(m?.location ?? "");
    setPresidentId(m?.president_id ?? "");
    setSecretaryId(m?.secretary_id ?? "");
    setStatus(m?.status ?? "rascunho");
    setAgendaText(asStringArray(m?.agenda).join("\n"));
    setAttendeesText(asStringArray(m?.attendees).join("\n"));
    setDeliberationsText(asStringArray(m?.deliberations).join("\n"));
    setContent(m?.content ?? "");
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error("Sem tenant ativo");
      if (!meetingType.trim()) throw new Error("Tipo de reunião é obrigatório");
      if (!meetingAt) throw new Error("Data da reunião é obrigatória");
      const payload: MinuteInput = {
        meeting_type: meetingType,
        meeting_at: new Date(meetingAt).toISOString(),
        next_meeting_at: nextAt ? new Date(nextAt).toISOString() : null,
        location: location || null,
        president_id: presidentId || null,
        secretary_id: secretaryId || null,
        status,
        agenda: splitLines(agendaText),
        attendees: splitLines(attendeesText),
        deliberations: splitLines(deliberationsText),
        content: content || null,
      };
      return initial
        ? updateMinute(initial.id, payload)
        : createMinute(currentTenant.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minutes"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) reset(initial);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar ata" : "Nova ata"}</DialogTitle>
          <DialogDescription>
            Preencha os dados da reunião. Use uma linha por item nas listas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de reunião *</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as MinuteStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MINUTE_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data e hora *</Label>
              <Input type="datetime-local" value={meetingAt}
                onChange={(e) => setMeetingAt(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Próxima reunião</Label>
              <Input type="datetime-local" value={nextAt}
                onChange={(e) => setNextAt(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Local</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Presidente</Label>
              <Select value={presidentId || "_none"} onValueChange={(v) => setPresidentId(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Nenhum —</SelectItem>
                  {(members ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Secretário</Label>
              <Select value={secretaryId || "_none"} onValueChange={(v) => setSecretaryId(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Nenhum —</SelectItem>
                  {(members ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Presentes <span className="text-xs text-muted-foreground">(uma linha por pessoa)</span></Label>
            <Textarea rows={3} value={attendeesText} onChange={(e) => setAttendeesText(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Pauta <span className="text-xs text-muted-foreground">(uma linha por item)</span></Label>
            <Textarea rows={4} value={agendaText} onChange={(e) => setAgendaText(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Conteúdo / Discussão</Label>
            <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Deliberações <span className="text-xs text-muted-foreground">(uma linha por item)</span></Label>
            <Textarea rows={4} value={deliberationsText} onChange={(e) => setDeliberationsText(e.target.value)} />
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

function splitLines(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
