import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import {
  listMyNotifications,
  markAllAsRead,
  markAsRead,
  type Notification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import notificationSoundAsset from "@/assets/notification.mp3.asset.json";


export function NotificationBell() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const tenant = useTenantStore((s) => s.currentTenant);
  const userId = session?.user.id;
  const tenantId = tenant?.id;

  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const audio = new Audio(notificationSoundAsset.url);
    audio.preload = "auto";
    audio.volume = 0.7;
    audioRef.current = audio;
    return () => {
      audioRef.current = null;
    };
  }, []);

  function playSound() {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        /* autoplay blocked until user interacts */
      });
    } catch {
      /* silent */
    }
  }


  const unread = items.filter((n) => !n.read_at).length;

  async function load() {
    if (!tenantId || !userId) return;
    try {
      const rows = await listMyNotifications(tenantId, userId);
      setItems(rows.slice(0, 20));
    } catch {
      /* silent */
    }
  }

  useEffect(() => {
    load();
  }, [tenantId, userId]);

  useEffect(() => {
    if (!tenantId || !userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          playSound();
          load();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          load();
        },
      )

      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, userId]);

  async function openNotification(n: Notification) {
    if (!n.read_at) {
      try {
        await markAsRead(n.id);
        setItems((prev) =>
          prev.map((it) => (it.id === n.id ? { ...it, read_at: new Date().toISOString() } : it)),
        );
      } catch {
        /* silent */
      }
    }
    setOpen(false);
    if (n.url) {
      navigate({ to: n.url as never });
    } else {
      navigate({ to: "/app/notificacoes" });
    }
  }

  async function handleMarkAll() {
    if (!tenantId || !userId) return;
    try {
      await markAllAsRead(tenantId, userId);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    } catch {
      /* silent */
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleMarkAll}
            disabled={unread === 0}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Marcar todas
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nada por aqui.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                      !n.read_at && "bg-accent/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium leading-tight">{n.title}</span>
                      {!n.read_at && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {n.body && (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {n.body}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/app/notificacoes" });
            }}
          >
            Ver todas
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
