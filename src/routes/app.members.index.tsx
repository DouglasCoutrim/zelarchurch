import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Plus, Search, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DEFAULT_PAGE_SIZE } from "@/config/constants";
import { listMembers } from "@/lib/members";
import { MEMBER_STATUS_OPTIONS, type MemberStatus } from "@/types/member";
import { useTenantStore } from "@/stores/tenantStore";
import { usePlanLimit } from "@/hooks/usePlanLimit";

const searchSchema = z.object({
  q: z.string().optional().default(""),
  status: z.enum(["all", "ativo", "inativo", "afastado", "visitante", "excluido"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const Route = createFileRoute("/app/members/")({
  head: () => ({ meta: [{ title: "Membros" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: MembersList,
});

function MembersList() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const { canAddMember, usage } = usePlanLimit(currentTenant?.id);

  const [searchInput, setSearchInput] = useState(search.q);
  useEffect(() => setSearchInput(search.q), [search.q]);

  // Debounce search input → URL
  useEffect(() => {
    if (searchInput === search.q) return;
    const t = setTimeout(() => {
      navigate({
        to: "/app/members",
        search: { q: searchInput, status: search.status, page: 1 },
        replace: true,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search.q, search.status, navigate]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["members", currentTenant?.id, search.q, search.status, search.page],
    enabled: !!currentTenant?.id,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listMembers({
        tenantId: currentTenant!.id,
        search: search.q,
        status: search.status as MemberStatus | "all",
        page: search.page,
        pageSize: DEFAULT_PAGE_SIZE,
      }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

  function setStatus(v: string) {
    navigate({
      to: "/app/members",
      search: { q: search.q, status: v as MemberStatus | "all", page: 1 },
      replace: true,
    });
  }
  function setPage(p: number) {
    navigate({
      to: "/app/members",
      search: { q: search.q, status: search.status, page: p },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
          <p className="text-sm text-muted-foreground">
            {usage
              ? `${usage.currentMembers} de ${usage.maxMembers} membros usados`
              : "Gerencie os membros da sua igreja."}
          </p>
        </div>
        <Button disabled={!canAddMember} title={!canAddMember ? "Limite do plano atingido" : undefined}>
          <Plus className="mr-1 h-4 w-4" />
          Novo membro
        </Button>
      </div>

      {!canAddMember && usage && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Limite do plano atingido</AlertTitle>
          <AlertDescription>
            Você atingiu o limite de {usage.maxMembers} membros. Faça upgrade do plano para adicionar mais.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, e-mail ou CPF..."
            className="pl-8"
          />
        </div>
        <Select value={search.status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {MEMBER_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar membros</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead className="hidden lg:table-cell">Telefone</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : data && data.rows.length > 0 ? (
              data.rows.map((m) => (
                <TableRow key={m.id} className="cursor-pointer" onClick={() =>
                  navigate({ to: "/app/members/$id", params: { id: m.id } })
                }>
                  <TableCell className="font-medium">
                    <Link to="/app/members/$id" params={{ id: m.id }} className="hover:underline">
                      {m.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{m.email ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{m.phone ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{m.member_type ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                  {search.q || search.status !== "all"
                    ? "Nenhum membro encontrado para esses filtros."
                    : "Nenhum membro ainda. Clique em \"Novo membro\" para começar."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Página {search.page} de {totalPages} — {total} {total === 1 ? "membro" : "membros"}
            {isFetching && " · atualizando..."}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={search.page <= 1}
              onClick={() => setPage(search.page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={search.page >= totalPages}
              onClick={() => setPage(search.page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const map: Record<MemberStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    ativo: { label: "Ativo", variant: "default" },
    inativo: { label: "Inativo", variant: "secondary" },
    afastado: { label: "Afastado", variant: "outline" },
    visitante: { label: "Visitante", variant: "outline" },
    excluido: { label: "Excluído", variant: "destructive" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
