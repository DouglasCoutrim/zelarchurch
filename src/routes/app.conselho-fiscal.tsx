import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ShieldCheck, Calendar } from "lucide-react";

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
  listFiscalOpinions, createFiscalOpinion, deleteFiscalOpinion,
  FISCAL_VERDICT_OPTIONS, type FiscalOpinion, type FiscalVerdict,
} from "@/lib/fiscal";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/conselho-fiscal")({
  head: () => ({ meta: [{ title: "Conselho Fiscal" }] }),
  component: FiscalPage,
});

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function verdictVariant(v: string): "default" | "secondary" | "destructive" {
  if (v === "aprovado") return "default";
  if (v === "reprovado") return "destructive";
  return "secondary";
}

function FiscalPage() {
  const qc = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<FiscalOpinion | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["fiscal-opinions", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => listFiscalOpinions(currentTenant!.id),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFiscalOpinion(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fiscal-opinions"] }); setDeleting(null); },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conselho Fiscal</h1>
          <p className="text-sm text-muted-foreground">
            Pareceres assinados sobre prestação de contas e auditorias.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo parecer
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
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-md border p-12 text-center">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum parecer registrado.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((o) => (
            <Card key={o.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      Parecer
                      <Badge variant={verdictVariant(o.verdict)}>
                        {FISCAL_VERDICT_OPTIONS.find((v) => v.value === o.verdict)?.label ?? o.verdict}
                      </Badge>
                    </CardTitle>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {fmtDate(o.period_start)} — {fmtDate(o.period_end)}
                      </span>
                      <span>Assinado em {new Date(o.signed_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(o)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm whitespace-pre-wrap">{o.observations}</CardContent>
            </Card>
          ))}
        </div>
      )}

      <OpinionDialog open={creating} onOpenChange={setCreating} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parecer</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir parecer assinado em {deleting ? new Date(deleting.signed_at).toLocaleDateString("pt-BR") : ""}?
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

function OpinionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const today = new Date().toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [verdict, setVerdict] = useState<FiscalVerdict>("aprovado");
  const [observations, setObservations] = useState("");

  function reset() {
    setPeriodStart(today); setPeriodEnd(today);
    setVerdict("aprovado"); setObservations("");
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error("Sem tenant ativo");
      if (!observations.trim()) throw new Error("Observações são obrigatórias");
      return createFiscalOpinion(currentTenant.id, {
        period_start: periodStart, period_end: periodEnd, verdict, observations: observations.trim(),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fiscal-opinions"] }); onOpenChange(false); },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo parecer fiscal</DialogTitle>
          <DialogDescription>O parecer será assinado em seu nome.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Início do período</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Fim do período</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Parecer</Label>
            <Select value={verdict} onValueChange={(v) => setVerdict(v as FiscalVerdict)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FISCAL_VERDICT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observações *</Label>
            <Textarea rows={6} value={observations} onChange={(e) => setObservations(e.target.value)} required />
          </div>
          {mut.error && (
            <Alert variant="destructive"><AlertDescription>{(mut.error as Error).message}</AlertDescription></Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Assinando..." : "Assinar parecer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
