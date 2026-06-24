import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, UserCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listPrayerRequests, updatePrayerStatus, deletePrayerRequest,
  PRAYER_STATUS_LABEL, type PrayerStatus,
} from "@/lib/prayers";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/oracao/")({
  component: PrayerIndex,
});

const STATUS_VARIANT: Record<PrayerStatus, "default" | "secondary" | "outline"> = {
  aberto: "default",
  em_oracao: "secondary",
  respondido: "outline",
  arquivado: "outline",
};

function PrayerIndex() {
  const tenant = useTenantStore((s) => s.currentTenant);
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["prayer-requests", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: () => listPrayerRequests(tenant!.id),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PrayerStatus }) =>
      updatePrayerStatus(id, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["prayer-requests", tenant?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deletePrayerRequest(id),
    onSuccess: () => {
      toast.success("Pedido excluído");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["prayer-requests", tenant?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pastoral"
        title="Pedidos de oração"
        description="Compartilhe um pedido — ele será enviado ao pastor e ao ministério de intercessão."
        actions={
          <Button asChild>
            <Link to="/app/oracao/novo">
              <Plus className="mr-1 h-4 w-4" />
              Novo pedido
            </Link>
          </Button>
        }
      />

      {q.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : q.error ? (
        <p className="text-sm text-destructive">Erro ao carregar pedidos.</p>
      ) : (q.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum pedido por aqui ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {q.data!.map((p) => {
            const authorLabel = p.is_anonymous
              ? "Anônimo"
              : p.requester_name || p.author?.full_name || "Membro";
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                      {authorLabel}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[p.status]}>
                        {PRAYER_STATUS_LABEL[p.status]}
                      </Badge>
                      <Select
                        value={p.status}
                        onValueChange={(v) =>
                          statusMut.mutate({ id: p.id, status: v as PrayerStatus })
                        }
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PRAYER_STATUS_LABEL) as PrayerStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {PRAYER_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Excluir pedido"
                        onClick={() => setToDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="whitespace-pre-wrap">{p.content}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {new Date(p.created_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    {!p.is_anonymous && p.requester_contact && (
                      <span>Contato: {p.requester_contact}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
