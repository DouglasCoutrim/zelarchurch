import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Power, PowerOff, AlertTriangle, Church } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { CongregationForm } from "@/components/CongregationForm";
import { useTenantStore } from "@/stores/tenantStore";
import {
  Congregation,
  activateCongregation,
  canAddCongregation,
  deactivateCongregation,
  getCongregationsUsage,
  listCongregations,
} from "@/lib/congregations";

export const Route = createFileRoute("/app/congregations")({
  head: () => ({ meta: [{ title: "Congregações" }] }),
  component: CongregationsPage,
});

function formatLimit(max: number | null): string {
  if (max === null) return "Ilimitado";
  return String(max);
}

function CongregationsPage() {
  const qc = useQueryClient();
  const tenant = useTenantStore((s) => s.currentTenant);
  const tenantId = tenant?.id ?? null;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Congregation | null>(null);
  const [toggling, setToggling] = useState<Congregation | null>(null);

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["congregations", tenantId],
    enabled: !!tenantId,
    queryFn: () => listCongregations(tenantId!),
  });

  const { data: usage } = useQuery({
    queryKey: ["congregations-usage", tenantId],
    enabled: !!tenantId,
    queryFn: () => getCongregationsUsage(tenantId!),
  });

  const toggleMut = useMutation({
    mutationFn: async (c: Congregation) => {
      if (c.is_active) await deactivateCongregation(c.id);
      else await activateCongregation(c.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["congregations", tenantId] });
      qc.invalidateQueries({ queryKey: ["congregations-usage", tenantId] });
      setToggling(null);
    },
  });

  const canAdd = canAddCongregation(usage);
  const limitReached = !!usage && usage.max !== null && usage.current === usage.max;
  const overLimit = !!usage && usage.max !== null && usage.current > usage.max;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Congregações</h1>
          <p className="text-sm text-muted-foreground">
            {usage
              ? `${usage.current} de ${formatLimit(usage.max)} congregações cadastradas.`
              : "Gerencie as filiais vinculadas à sua igreja."}
          </p>
        </div>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button onClick={() => setCreating(true)} disabled={!canAdd || !tenantId}>
                  <Plus className="mr-1 h-4 w-4" /> Nova Congregação
                </Button>
              </span>
            </TooltipTrigger>
            {!canAdd && tenantId && (
              <TooltipContent>Limite do plano atingido</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {overLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Limite do plano excedido</AlertTitle>
          <AlertDescription>
            Seu plano atual permite {usage?.max} congregações, mas você possui {usage?.current}.
            As congregações existentes continuam funcionando normalmente, mas não será possível
            cadastrar novas até que o plano seja ajustado ou congregações sejam desativadas.
          </AlertDescription>
        </Alert>
      )}

      {limitReached && !overLimit && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Limite do plano atingido</AlertTitle>
          <AlertDescription>
            Seu plano permite até {usage?.max} congregações. Faça upgrade para cadastrar mais.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !list || list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <Church className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhuma congregação cadastrada ainda.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c) => (
                  <TableRow key={c.id} className={!c.is_active ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      {[c.city, c.state].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell>{c.responsible?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      {c.is_active ? (
                        <Badge variant="secondary">Ativa</Badge>
                      ) : (
                        <Badge variant="outline">Inativa</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(c)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setToggling(c)}
                        title={c.is_active ? "Desativar" : "Ativar"}
                      >
                        {c.is_active ? (
                          <PowerOff className="h-4 w-4 text-destructive" />
                        ) : (
                          <Power className="h-4 w-4 text-emerald-600" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {tenantId && (
        <CongregationForm
          open={creating || !!editing}
          onOpenChange={(v) => {
            if (!v) {
              setCreating(false);
              setEditing(null);
            }
          }}
          tenantId={tenantId}
          initial={editing}
        />
      )}

      <AlertDialog open={!!toggling} onOpenChange={(v) => !v && setToggling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggling?.is_active ? "Desativar congregação" : "Ativar congregação"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggling?.is_active
                ? `A congregação "${toggling?.name}" ficará inativa e não aparecerá em listagens operacionais.`
                : `A congregação "${toggling?.name}" será reativada.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (toggling) toggleMut.mutate(toggling);
              }}
            >
              {toggleMut.isPending ? "Aplicando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
