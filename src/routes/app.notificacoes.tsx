import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Check, Trash2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  listMyNotifications, markAsRead, markAllAsRead, deleteNotification,
  type Notification,
} from "@/lib/notifications";
import { useTenantStore } from "@/stores/tenantStore";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/app/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações" }] }),
  component: NotificationsPage,
});

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function NotificationsPage() {
  const qc = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", currentTenant?.id, userId],
    enabled: !!currentTenant?.id && !!userId,
    queryFn: () => listMyNotifications(currentTenant!.id, userId!),
  });

  const readMut = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const readAllMut = useMutation({
    mutationFn: () => markAllAsRead(currentTenant!.id, userId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Atividade"
        title="Notificações"
        description={unreadCount > 0 ? `${unreadCount} não lida(s)` : "Você está em dia."}
        actions={
          <Button variant="outline" disabled={unreadCount === 0 || readAllMut.isPending}
            onClick={() => readAllMut.mutate()}>
            <CheckCheck className="mr-1 h-4 w-4" /> Marcar todas como lidas
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-md border p-12 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {(data ?? []).map((n) => <NotificationRow key={n.id} n={n}
            onRead={() => readMut.mutate(n.id)} onDelete={() => delMut.mutate(n.id)} />)}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  n, onRead, onDelete,
}: { n: Notification; onRead: () => void; onDelete: () => void }) {
  return (
    <Card className={`flex items-start gap-3 p-4 ${n.read_at ? "opacity-70" : ""}`}>
      <div className="mt-0.5">
        <Bell className={`h-4 w-4 ${n.read_at ? "text-muted-foreground" : "text-primary"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{n.title}</p>
          {!n.read_at && <Badge variant="secondary">Nova</Badge>}
        </div>
        {n.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{fmt(n.created_at)}</p>
      </div>
      <div className="flex gap-1">
        {n.url && (
          <Button size="sm" variant="ghost" asChild>
            <a href={n.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        )}
        {!n.read_at && (
          <Button size="sm" variant="ghost" onClick={onRead} title="Marcar como lida">
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
