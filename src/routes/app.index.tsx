import { createFileRoute } from "@tanstack/react-router";
import { Users, Building2, Sparkles, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePlanLimit } from "@/hooks/usePlanLimit";
import { useTenantStore } from "@/stores/tenantStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Painel" }] }),
  component: Dashboard,
});

function Dashboard() {
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const { usage, loading, error, isNearLimit } = usePlanLimit(currentTenant?.id);

  const enabledFeatures = usage
    ? Object.entries(usage.features).filter(([, on]) => on).map(([k]) => k)
    : [];

  const membersNear = isNearLimit("members");
  const deptsNear = isNearLimit("departments");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral de {currentTenant?.name ?? "sua área de trabalho"}.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar o uso do plano</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {(membersNear || deptsNear) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção aos limites do plano</AlertTitle>
          <AlertDescription>
            Você está próximo do limite de{" "}
            {[membersNear && "membros", deptsNear && "departamentos"]
              .filter(Boolean)
              .join(" e ")}
            . Considere fazer um upgrade.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UsageCard
          title="Membros"
          description="Cadastrados na sua igreja"
          icon={Users}
          current={usage?.currentMembers}
          max={usage?.maxMembers}
          loading={loading}
          near={membersNear}
        />
        <UsageCard
          title="Departamentos"
          description="Departamentos ativos"
          icon={Building2}
          current={usage?.currentDepartments}
          max={usage?.maxDepartments}
          loading={loading}
          near={deptsNear}
        />
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Plano</CardTitle>
              <CardDescription>Recursos disponíveis</CardDescription>
            </div>
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : enabledFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum recurso ativo.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {enabledFeatures.map((f) => (
                  <Badge key={f} variant="secondary" className="font-normal">
                    {f}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsageCard({
  title,
  description,
  icon: Icon,
  current,
  max,
  loading,
  near,
}: {
  title: string;
  description: string;
  icon: typeof Users;
  current?: number;
  max?: number;
  loading: boolean;
  near: boolean;
}) {
  const pct = max && max > 0 ? Math.min(100, Math.round(((current ?? 0) / max) * 100)) : 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-2 w-full" />
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{current ?? 0}</span>
              <span className="text-sm text-muted-foreground">/ {max ?? 0}</span>
            </div>
            <Progress value={pct} className={cn(near && "[&>div]:bg-destructive")} />
            <p className="text-xs text-muted-foreground">{pct}% utilizado</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
