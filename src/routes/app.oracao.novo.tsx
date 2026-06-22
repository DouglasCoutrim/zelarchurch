import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, HandHeart, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { submitPrayerRequest } from "@/lib/prayers";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/oracao/novo")({
  component: NewPrayerRequest,
});

const MAX = 2000;

function NewPrayerRequest() {
  const tenant = useTenantStore((s) => s.currentTenant);
  const navigate = useNavigate();
  const [anonymous, setAnonymous] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [content, setContent] = useState("");

  const mut = useMutation({
    mutationFn: () => {
      if (!tenant?.id) throw new Error("Sem igreja ativa");
      const text = content.trim();
      if (text.length < 5) throw new Error("Escreva um pedido com pelo menos 5 caracteres.");
      if (text.length > MAX) throw new Error(`Máximo de ${MAX} caracteres.`);
      return submitPrayerRequest({
        tenantId: tenant.id,
        content: text,
        isAnonymous: anonymous,
        requesterName: anonymous ? null : name.trim() || null,
        requesterContact: anonymous ? null : contact.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Pedido enviado. A equipe de intercessão foi notificada.");
      navigate({ to: "/app/oracao" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/app/oracao">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-primary" />
            Fazer um pedido de oração
          </CardTitle>
          <CardDescription>
            Seu pedido será enviado ao pastor e aos intercessores da igreja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="anon" className="font-medium">Pedido anônimo</Label>
              <p className="text-xs text-muted-foreground">
                Seu nome não será exibido para os intercessores.
              </p>
            </div>
            <Switch id="anon" checked={anonymous} onCheckedChange={setAnonymous} />
          </div>

          {!anonymous && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Seu nome (opcional)</Label>
                <Input
                  id="name"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como prefere ser identificado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contato (opcional)</Label>
                <Input
                  id="contact"
                  value={contact}
                  maxLength={160}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Telefone ou e-mail"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="content">Pedido de oração</Label>
            <Textarea
              id="content"
              rows={8}
              value={content}
              maxLength={MAX}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Compartilhe seu pedido…"
            />
            <p className="text-right text-xs text-muted-foreground">
              {content.length}/{MAX}
            </p>
          </div>

          <Button
            className="w-full"
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1 h-4 w-4" />
            )}
            Enviar pedido
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
