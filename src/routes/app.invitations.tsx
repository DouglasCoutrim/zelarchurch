import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Loader2, Plus, QrCode, Share2, Check, X, UserCheck } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { APP_NAME } from "@/config/constants";
import { supabase } from "@/integrations/supabase/client";
import { useTenantStore } from "@/stores/tenantStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/invitations")({
  head: () => ({
    meta: [
      { title: `Códigos de acesso — ${APP_NAME}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: InvitationsPage,
});

type AccessCode = {
  id: string;
  code: string;
  label: string | null;
  requires_approval: boolean;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

type Pending = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

function InvitationsPage() {
  const tenant = useTenantStore((s) => s.currentTenant);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const codesQuery = useQuery({
    queryKey: ["access_codes", tenant?.id],
    enabled: !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_codes")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AccessCode[];
    },
  });

  const reqQuery = useQuery({
    queryKey: ["membership_requests", tenant?.id],
    enabled: !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_requests")
        .select("id, full_name, email, phone, status, created_at")
        .eq("tenant_id", tenant!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Pending[];
    },
  });

  async function review(id: string, action: "approve" | "reject") {
    const rpc = action === "approve" ? "approve_membership_request" : "reject_membership_request";
    const { error } = await supabase.rpc(rpc, { p_request_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success(action === "approve" ? "Membro aprovado" : "Solicitação rejeitada");
      qc.invalidateQueries({ queryKey: ["membership_requests"] });
    }
  }

  async function toggleActive(c: AccessCode) {
    const { error } = await supabase
      .from("access_codes")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["access_codes"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Códigos de acesso</h1>
          <p className="text-sm text-muted-foreground">
            Gere QR codes / links para novos membros entrarem na sua igreja.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gold">
              <Plus className="mr-1.5 h-4 w-4" /> Novo código
            </Button>
          </DialogTrigger>
          <CreateCodeDialog
            onCreated={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["access_codes"] });
            }}
          />
        </Dialog>
      </div>

      {/* Solicitações pendentes */}
      {(reqQuery.data?.length ?? 0) > 0 && (
        <section className="rounded-xl glass-strong p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UserCheck className="h-4 w-4" /> Solicitações pendentes
          </h2>
          <ul className="divide-y divide-border/60">
            {reqQuery.data!.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.email} {r.phone && `· ${r.phone}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => review(r.id, "reject")}>
                    <X className="mr-1 h-3.5 w-3.5" /> Rejeitar
                  </Button>
                  <Button size="sm" variant="gold" onClick={() => review(r.id, "approve")}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lista de códigos */}
      <section className="rounded-xl glass-strong p-4">
        {codesQuery.isLoading ? (
          <div className="flex justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (codesQuery.data?.length ?? 0) === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum código criado ainda.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {codesQuery.data!.map((c) => (
              <CodeCard key={c.id} code={c} onToggle={() => toggleActive(c)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CreateCodeDialog({ onCreated }: { onCreated: () => void }) {
  const [label, setLabel] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresDays, setExpiresDays] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const expiresAt = expiresDays
        ? new Date(Date.now() + Number(expiresDays) * 86_400_000).toISOString()
        : null;
      const { error } = await supabase.rpc("create_access_code", {
        p_label: label || null,
        p_requires_approval: requiresApproval,
        p_max_uses: maxUses ? Number(maxUses) : null,
        p_expires_at: expiresAt,
      });
      if (error) throw error;
      toast.success("Código criado");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo código de acesso</DialogTitle>
        <DialogDescription>
          O código gera um QR e um link curto. Por padrão, novos membros são
          aprovados automaticamente.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Rótulo (opcional)</Label>
          <Input
            placeholder="Ex: Recepção, Domingo manhã"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Exigir aprovação</p>
            <p className="text-xs text-muted-foreground">
              Quando ativo, o admin precisa aprovar cada novo cadastro.
            </p>
          </div>
          <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Limite de usos</Label>
            <Input
              type="number"
              min={1}
              placeholder="Sem limite"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Expira em (dias)</Label>
            <Input
              type="number"
              min={1}
              placeholder="Sem expiração"
              value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value)}
            />
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      <DialogFooter>
        <Button variant="gold" disabled={submitting} onClick={submit}>
          {submitting ? "Criando..." : "Criar código"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CodeCard({ code, onToggle }: { code: AccessCode; onToggle: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const link = `${window.location.origin}/join/${code.code}`;

  useEffect(() => {
    if (qrOpen && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, link, { width: 256, margin: 2 });
    }
  }, [qrOpen, link]);

  async function copy() {
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Convite", text: `Entre na nossa igreja: ${link}`, url: link });
      } catch {
        /* cancelled */
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, "_blank");
    }
  }

  async function download() {
    const dataUrl = await QRCode.toDataURL(link, { width: 512, margin: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qrcode-${code.code}.png`;
    a.click();
  }

  return (
    <li className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-lg font-bold">{code.code}</p>
          {code.label && <p className="text-xs text-muted-foreground">{code.label}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {code.requires_approval ? (
            <Badge variant="secondary">Aprovação manual</Badge>
          ) : (
            <Badge>Aprovação automática</Badge>
          )}
          {!code.is_active && <Badge variant="destructive">Inativo</Badge>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {code.current_uses} {code.max_uses ? `/ ${code.max_uses}` : ""} usos
        {code.expires_at &&
          ` · expira ${new Date(code.expires_at).toLocaleDateString("pt-BR")}`}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <QrCode className="mr-1 h-3.5 w-3.5" /> QR
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>QR Code · {code.code}</DialogTitle>
              <DialogDescription className="break-all font-mono text-xs">{link}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-2">
              <canvas ref={canvasRef} className="rounded-md bg-white p-2" />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={download}>
                <Download className="mr-1 h-3.5 w-3.5" /> Baixar PNG
              </Button>
              <Button variant="gold" onClick={share}>
                <Share2 className="mr-1 h-3.5 w-3.5" /> Compartilhar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy className="mr-1 h-3.5 w-3.5" /> Link
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggle}>
          {code.is_active ? "Desativar" : "Ativar"}
        </Button>
      </div>
    </li>
  );
}
