import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, X, Check } from "lucide-react";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listScheduleMembers, addMemberToSchedule, removeMemberFromSchedule,
  updateScheduleMember, CONFIRMATION_OPTIONS, type Confirmation,
} from "@/lib/schedules";
import { searchMembersForLink } from "@/lib/departments";
import { useTenantStore } from "@/stores/tenantStore";

export function ScheduleMembersDialog({
  open, onClose, scheduleId, scheduleTitle,
}: {
  open: boolean;
  onClose: () => void;
  scheduleId: string;
  scheduleTitle: string;
}) {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);

  const linkedQ = useQuery({
    queryKey: ["schedule-members", scheduleId],
    enabled: open,
    queryFn: () => listScheduleMembers(scheduleId),
  });

  const searchQ = useQuery({
    queryKey: ["schedule-search", tenant?.id, debounced],
    enabled: open && !!tenant?.id,
    queryFn: () => searchMembersForLink(tenant!.id, debounced),
  });

  const linkedIds = useMemo(
    () => new Set((linkedQ.data ?? []).map((r) => r.member_id)),
    [linkedQ.data],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["schedule-members", scheduleId] });
    qc.invalidateQueries({ queryKey: ["schedules"] });
  };

  const addMut = useMutation({
    mutationFn: (memberId: string) =>
      addMemberToSchedule(tenant!.id, scheduleId, memberId),
    onSuccess: invalidate,
  });
  const removeMut = useMutation({
    mutationFn: (memberId: string) => removeMemberFromSchedule(scheduleId, memberId),
    onSuccess: invalidate,
  });
  const confirmMut = useMutation({
    mutationFn: ({ memberId, confirmation }: { memberId: string; confirmation: Confirmation }) =>
      updateScheduleMember(scheduleId, memberId, { confirmation }),
    onSuccess: invalidate,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Membros da escala</DialogTitle>
          <DialogDescription>{scheduleTitle}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Adicionar membro</h3>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar pelo nome..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-auto rounded-md border p-1">
              {searchQ.isLoading ? (
                <Skeleton className="h-10" />
              ) : (searchQ.data ?? []).length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhum resultado.</p>
              ) : (
                (searchQ.data ?? []).map((m) => {
                  const linked = linkedIds.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="truncate">{m.full_name}</span>
                      <Button
                        size="sm" variant={linked ? "secondary" : "outline"}
                        disabled={linked || addMut.isPending}
                        onClick={() => addMut.mutate(m.id)}
                      >
                        {linked ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Escalados <Badge variant="secondary">{linkedQ.data?.length ?? 0}</Badge>
            </h3>
            <div className="max-h-72 space-y-1 overflow-auto rounded-md border p-1">
              {linkedQ.isLoading ? (
                <Skeleton className="h-10" />
              ) : (linkedQ.data ?? []).length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhum membro escalado.</p>
              ) : (
                (linkedQ.data ?? []).map((r) => (
                  <div
                    key={r.member_id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className="flex-1 truncate">{r.member.full_name}</span>
                    <Select
                      value={r.confirmation ?? "pendente"}
                      onValueChange={(v) =>
                        confirmMut.mutate({ memberId: r.member_id, confirmation: v as Confirmation })
                      }
                    >
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONFIRMATION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => removeMut.mutate(r.member_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
