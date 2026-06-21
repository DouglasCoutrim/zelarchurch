import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Megaphone, Calendar, MapPin, Send, Undo2 } from "lucide-react";

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
  listConvocations, createConvocation, updateConvocation,
  publishConvocation, unpublishConvocation, deleteConvocation,
  type Convocation, type ConvocationInput,
} from "@/lib/convocations";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/convocacoes")({
  head: () => ({ meta: [{ title: "Convocações" }] }),
  component: ConvocationsPage,
});

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ConvocationsPage() {
  const qc = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [editing, setEditing] = useState<Convocation | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Convocation | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["convocations", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => listConvocations(currentTenant!.id),
  });

  const pubMut = useMutation({
    mutationFn: (c: Convocation) => c.published_at ? unpublishConvocation(c.id) : publishConvocation(c.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["convocations"] }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteConvocation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["convocations"] }); setDeleting(null); },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Convocações</h1>
          <p className="text-sm text-muted-foreground">
            Edital de assembleias, reuniões e eventos oficiais.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova convocação
        </Button>
      </div>

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
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-md border p-12 text-center">
          <Megaphone className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma convocação registrada.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((c) => (
            <Card key={c.id} className="transition hover:shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {c.title}
                      <Badge variant={c.published_at ? "default" : "outline"}>
                        {c.published_at ? "Publicada" : "Rascunho"}
                      </Badge>
                    </CardTitle>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmt(c.meeting_at)}</span>
                      {c.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.location}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => pubMut.mutate(c)} title={c.published_at ? "Despublicar" : "Publicar"}>
                      {c.published_at ? <Undo2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {c.body && (
                <CardContent className="pt-0 text-sm text-muted-foreground whitespace-pre-wrap">
                  {c.body}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConvocationDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        initial={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir convocação</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir "{deleting?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (deleting) delMut.mutate(deleting.id); }}>
              {delMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConvocationDialog({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial: Convocation | null }) {
  const qc = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [meetingAt, setMeetingAt] = useState(toLocalInput(initial?.meeting_at));
  const [location, setLocation] = useState(initial?.location ?? "");

  function reset(c: Convocation | null) {
    setTitle(c?.title ?? "");
    setBody(c?.body ?? "");
    setMeetingAt(toLocalInput(c?.meeting_at));
    setLocation(c?.location ?? "");
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error("Sem tenant ativo");
      if (!title.trim()) throw new Error("Título é obrigatório");
      if (!meetingAt) throw new Error("Data é obrigatória");
      const payload: ConvocationInput = {
        title: title.trim(),
        body: body || null,
        meeting_at: new Date(meetingAt).toISOString(),
        location: location || null,
      };
      return initial
        ? updateConvocation(initial.id, payload)
        : createConvocation(currentTenant.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["convocations"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) reset(initial); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar convocação" : "Nova convocação"}</DialogTitle>
          <DialogDescription>Convoque membros para reuniões e assembleias.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Data e hora *</Label>
              <Input type="datetime-local" value={meetingAt}
                onChange={(e) => setMeetingAt(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Local</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Corpo / Edital</Label>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {mut.error && (
            <Alert variant="destructive"><AlertDescription>{(mut.error as Error).message}</AlertDescription></Alert>
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
