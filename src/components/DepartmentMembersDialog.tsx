import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getDepartmentMembers, addMemberToDepartment, removeMemberFromDepartment,
  searchMembersForLink,
} from "@/lib/departments";
import { useTenantStore } from "@/stores/tenantStore";

export function DepartmentMembersDialog({
  open, onOpenChange, departmentId, departmentName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departmentId: string | null;
  departmentName: string;
}) {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ["department-members", departmentId],
    enabled: !!departmentId && open,
    queryFn: () => getDepartmentMembers(departmentId!),
  });

  const candidates = useQuery({
    queryKey: ["member-search", currentTenant?.id, term],
    enabled: !!currentTenant?.id && open,
    queryFn: () => searchMembersForLink(currentTenant!.id, term),
  });

  const addMut = useMutation({
    mutationFn: (memberId: string) =>
      addMemberToDepartment(currentTenant!.id, departmentId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-members", departmentId] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (memberId: string) => removeMemberFromDepartment(departmentId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-members", departmentId] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const linkedIds = new Set(members.data?.map((m) => m.id) ?? []);
  const available = (candidates.data ?? []).filter((c) => !linkedIds.has(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Membros de {departmentName}</DialogTitle>
          <DialogDescription>
            Adicione ou remova membros vinculados a este departamento.
          </DialogDescription>
        </DialogHeader>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              Vinculados ({members.data?.length ?? 0})
            </h4>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
              {members.isLoading && <Skeleton className="h-10 w-full" />}
              {members.data?.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">Nenhum membro vinculado.</p>
              )}
              {members.data?.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-muted">
                  <Avatar className="h-7 w-7">
                    {m.photo_url && <AvatarImage src={m.photo_url} />}
                    <AvatarFallback className="text-xs">
                      {m.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm">{m.full_name}</span>
                  <Button size="sm" variant="ghost"
                    onClick={() => removeMut.mutate(m.id)}
                    disabled={removeMut.isPending}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Adicionar membros</h4>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={term} onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar membro..." className="pl-8" />
            </div>
            <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
              {candidates.isLoading && <Skeleton className="h-10 w-full" />}
              {available.length === 0 && !candidates.isLoading && (
                <p className="p-2 text-sm text-muted-foreground">
                  {term ? "Nenhum membro encontrado." : "Todos já estão vinculados."}
                </p>
              )}
              {available.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-muted">
                  <span className="flex-1 truncate text-sm">{c.full_name}</span>
                  <Button size="sm" variant="ghost"
                    onClick={() => addMut.mutate(c.id)}
                    disabled={addMut.isPending}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
