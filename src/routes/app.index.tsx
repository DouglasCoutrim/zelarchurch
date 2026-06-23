import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  Building2,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarDays,
  ShoppingCart,
  Bell,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePlanLimit } from "@/hooks/usePlanLimit";
import { useTenantStore } from "@/stores/tenantStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getCongregationsUsage } from "@/lib/congregations";
import { loadDashboard, type DashboardStats, type RecentTransaction, type UpcomingSchedule } from "@/lib/dashboard";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Painel" }] }),
  component: Dashboard,
});

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Dashboard() {
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const session = useAuthStore((s) => s.session);
  const { usage, loading: planLoading, error, isNearLimit } = usePlanLimit(currentTenant?.id);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingSchedule[]>([]);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant?.id || !session?.user.id) return;
    setLoading(true);
    loadDashboard(currentTenant.id, session.user.id)
      .then((d) => {
        setStats(d.stats);
        setUpcoming(d.upcoming);
        setRecent(d.recent);
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => setLoading(false));
  }, [currentTenant?.id, session?.user.id]);

  const { data: congUsage } = useQuery({
    queryKey: ["congregations-usage", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => getCongregationsUsage(currentTenant!.id),
  });

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
            {[membersNear && "membros", deptsNear && "departamentos"].filter(Boolean).join(" e ")}.
            Considere fazer um upgrade.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs financeiros e operacionais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Entradas (mês)"
          value={loading ? null : BRL(stats?.monthIncome ?? 0)}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          title="Saídas (mês)"
          value={loading ? null : BRL(stats?.monthExpense ?? 0)}
          icon={TrendingDown}
          tone="danger"
        />
        <KpiCard
          title="Saldo (mês)"
          value={loading ? null : BRL(stats?.monthBalance ?? 0)}
          icon={Wallet}
          tone={(stats?.monthBalance ?? 0) >= 0 ? "success" : "danger"}
        />
        <KpiCard
          title="Membros ativos"
          value={loading ? null : String(stats?.membersActive ?? 0)}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          to="/app/escalas"
          label="Próximas escalas"
          value={stats?.upcomingSchedulesCount ?? 0}
          icon={CalendarDays}
        />
        <MiniStat
          to="/app/compras"
          label="Compras pendentes"
          value={stats?.pendingPurchases ?? 0}
          icon={ShoppingCart}
        />
        <MiniStat
          to="/app/checkin"
          label="Check-ins (7 dias)"
          value={stats?.lastCheckins ?? 0}
          icon={ClipboardCheck}
        />
        <MiniStat
          to="/app/notificacoes"
          label="Notificações não lidas"
          value={stats?.unreadNotifications ?? 0}
          icon={Bell}
        />
      </div>

      {/* Listas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Próximas escalas</CardTitle>
              <CardDescription>Eventos e cultos agendados.</CardDescription>
            </div>
            <Link to="/app/escalas" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma escala futura.
              </p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.starts_at).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {s.location && ` • ${s.location}`}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Movimentações recentes</CardTitle>
              <CardDescription>Últimas entradas e saídas.</CardDescription>
            </div>
            <Link to="/app/financeiro" className="text-sm text-primary hover:underline">
              Ver financeiro
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma movimentação registrada.
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((t) => {
                  const isIn = t.type === "entrada" || t.type === "income";
                  return (
                    <li key={t.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {t.description ?? "(sem descrição)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.transaction_date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-sm font-medium",
                          isIn ? "text-emerald-600" : "text-destructive",
                        )}
                      >
                        {isIn ? "+" : "-"} {BRL(Math.abs(t.amount))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plano */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UsageCard
          title="Membros"
          description="Cadastrados na sua igreja"
          icon={Users}
          current={usage?.currentMembers}
          max={usage?.maxMembers}
          loading={planLoading}
          near={membersNear}
        />
        <UsageCard
          title="Departamentos"
          description="Departamentos ativos"
          icon={Building2}
          current={usage?.currentDepartments}
          max={usage?.maxDepartments}
          loading={planLoading}
          near={deptsNear}
        />
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Congregações</CardTitle>
              <CardDescription>Filiais vinculadas</CardDescription>
            </div>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {!congUsage ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-2xl font-bold">
                  {congUsage.max === null
                    ? `${congUsage.current} (ilimitado)`
                    : `${congUsage.current} de ${congUsage.max}`}
                </p>
                <Link
                  to="/app/congregations"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Gerenciar <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Plano</CardTitle>
              <CardDescription>Recursos disponíveis</CardDescription>
            </div>
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {planLoading ? (
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

function KpiCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | null;
  icon: typeof Users;
  tone?: "success" | "danger";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "success" && "text-emerald-600",
            tone === "danger" && "text-destructive",
            !tone && "text-muted-foreground",
          )}
        />
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  to,
  label,
  value,
  icon: Icon,
}: {
  to: string;
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <Link to={to}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
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
