import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Search, Settings, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getDepartmentMembers, addMemberToDepartment, removeMemberFromDepartment,
  updateMemberDepartmentRole, searchMembersForLink,
  listDepartmentRoles, createDepartmentRole, updateDepartmentRole, deleteDepartmentRole,
  type DepartmentRole,
} from "@/lib/departments";
import { useTenantStore } from "@/stores/tenantStore";

const NONE = "__none";

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
  const [pendingRoleId, setPendingRoleId] = useState<string>(NONE);
  const [rolesOpen, setRolesOpen] = useState(false);

  const members = useQuery({
    queryKey: ["department-members", departmentId],
    enabled: !!departmentId && open,
    queryFn: () => getDepartmentMembers(departmentId!),
  });

  const roles = useQuery({
    queryKey: ["department-roles", departmentId],
    enabled: !!departmentId && open,
    queryFn: () => listDepartmentRoles(departmentId!),
  });

  const candidates = useQuery({
    queryKey: ["member-search", currentTenant?.id, term],
    enabled: !!currentTenant?.id && open,
    queryFn: () => searchMembersForLink(currentTenant!.id, term),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["department-members", departmentId] });
    queryClient.invalidateQueries({ queryKey: ["departments"] });
  };

  const addMut = useMutation({
    mutationFn: (memberId: string) =>
      addMemberToDepartment(
        currentTenant!.id, departmentId!, memberId,
        pendingRoleId === NONE ? null : pendingRoleId,
      ),
    onSuccess: () => { invalidate(); setError(null); },
    onError: (e: Error) => setError(e.message),
  });

  const roleMut = useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: string; roleId: string | null }) =>
      updateMemberDepartmentRole(departmentId!, memberId, roleId),
    onSuccess: () => invalidate(),
    onError: (e: Error) => setError(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (memberId: string) => removeMemberFromDepartment(departmentId!, memberId),
    onSuccess: () => invalidate(),
    onError: (e: Error) => setError(e.message),
  });

  const linkedIds = new Set(members.data?.map((m) => m.id) ?? []);
  const available = (candidates.data ?? []).filter((c) => !linkedIds.has(c.id));
  const roleList = roles.data ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Membros de {departmentName}</DialogTitle>
            <DialogDescription>
              Adicione membros, atribua funções e gerencie os papéis deste departamento.
            </DialogDescription>
          </DialogHeader>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {roleList.length} {roleList.length === 1 ? "função cadastrada" : "funções cadastradas"}
            </p>
            <Button size="sm" variant="outline" onClick={() => setRolesOpen(true)}>
              <Settings className="mr-1 h-4 w-4" />Gerenciar funções
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">
                Vinculados ({members.data?.length ?? 0})
              </h4>
              <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-2">
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
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{m.full_name}</div>
                      {m.role_name && (
                        <Badge variant="secondary" className="mt-0.5 text-[10px]">{m.role_name}</Badge>
                      )}
                    </div>
                    <Select
                      value={m.role_id ?? NONE}
                      onValueChange={(v) =>
                        roleMut.mutate({ memberId: m.id, roleId: v === NONE ? null : v })
                      }
                    >
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue placeholder="Função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— Sem função —</SelectItem>
                        {roleList.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              {roleList.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Função ao adicionar</Label>
                  <Select value={pendingRoleId} onValueChange={setPendingRoleId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Sem função —</SelectItem>
                      {roleList.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

      <DepartmentRolesDialog
        open={rolesOpen}
        onOpenChange={setRolesOpen}
        departmentId={departmentId}
        departmentName={departmentName}
        roles={roleList}
      />
    </>
  );
}

function DepartmentRolesDialog({
  open, onOpenChange, departmentId, departmentName, roles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departmentId: string | null;
  departmentName: string;
  roles: DepartmentRole[];
}) {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<DepartmentRole | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["department-roles", departmentId] });
    queryClient.invalidateQueries({ queryKey: ["department-members", departmentId] });
  };

  const createMut = useMutation({
    mutationFn: () => {
      if (!currentTenant?.id || !departmentId) throw new Error("Sem contexto");
      if (!name.trim()) throw new Error("Informe um nome");
      return createDepartmentRole(currentTenant.id, departmentId, { name: name.trim() });
    },
    onSuccess: () => { setName(""); setError(null); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("Nada selecionado");
      return updateDepartmentRole(editing.id, { name: editName.trim() });
    },
    onSuccess: () => { setEditing(null); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDepartmentRole(id),
    onSuccess: () => invalidate(),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Funções de {departmentName}</DialogTitle>
          <DialogDescription>
            Cadastre as funções deste departamento (ex.: baterista, tecladista, vocalista).
          </DialogDescription>
        </DialogHeader>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <form
          onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}
          className="flex gap-2"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nova função..."
          />
          <Button type="submit" disabled={createMut.isPending}>
            <Plus className="mr-1 h-4 w-4" />Adicionar
          </Button>
        </form>

        <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
          {roles.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">Nenhuma função cadastrada.</p>
          )}
          {roles.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-muted">
              {editing?.id === r.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 flex-1"
                  />
                  <Button size="sm" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{r.name}</span>
                  <Button size="sm" variant="ghost"
                    onClick={() => { setEditing(r); setEditName(r.name); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => deleteMut.mutate(r.id)}
                    disabled={deleteMut.isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
