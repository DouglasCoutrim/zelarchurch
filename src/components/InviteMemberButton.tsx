import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Share2, UserPlus, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";

type InviteResult = { id: string; token: string; expires_at: string };

export function InviteMemberButton() {
  const session = useAuthStore((s) => s.session);
  const tenant = useTenantStore((s) => s.currentTenant);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = useMemo(
    () => (invite ? `${window.location.origin}/invite/${invite.token}` : ""),
    [invite],
  );

  async function generate() {
    if (!session?.user || !tenant) return;
    setLoading(true);
    setError(null);
    try {
      const { data: member, error: mErr } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!member) {
        throw new Error(
          "Você ainda não está cadastrado como membro desta igreja.",
        );
      }
      const { data, error: rpcErr } = await supabase.rpc(
        "generate_member_invite",
        { p_member_id: member.id, p_expires_hours: 48, p_max_uses: 1 },
      );
      if (rpcErr) throw rpcErr;
      const row = Array.isArray(data) ? data[0] : data;
      setInvite(row as InviteResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar convite");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !invite && !loading) void generate();
    if (!open) {
      setInvite(null);
      setError(null);
      setCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function share() {
    const text = `Venha fazer parte da ${tenant?.name ?? "nossa igreja"} no Zelar: ${link}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Convite — ${tenant?.name ?? "Zelar"}`,
          text,
          url: link,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Convidar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar para o Zelar</DialogTitle>
          <DialogDescription>
            Compartilhe o link abaixo para convidar alguém para a{" "}
            <strong>{tenant?.name ?? "sua igreja"}</strong>. O convite expira
            em 48 horas e pode ser usado uma vez.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Gerando link...
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {invite && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={link} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expira em{" "}
              {new Date(invite.expires_at).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {invite && (
            <Button type="button" variant="gold" onClick={share} className="gap-1.5">
              <Share2 className="h-4 w-4" /> Compartilhar
            </Button>
          )}
          {error && (
            <Button type="button" variant="outline" onClick={generate}>
              Tentar novamente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
