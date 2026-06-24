import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  ArrowUpRight,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePlanLimit } from "@/hooks/usePlanLimit";
import { useTenantStore } from "@/stores/tenantStore";
import { useAuthStore } from "@/stores/authStore";
import { getCongregationsUsage } from "@/lib/congregations";
import {
  loadDashboard,
  type DashboardStats,
  type RecentTransaction,
  type UpcomingSchedule,
} from "@/lib/dashboard";
import { loadDashboardSeries } from "@/lib/dashboard-series";
import {
  ZPage,
  ZPageHeader,
  ZSection,
  ZGrid,
  ZKpi,
  ZPanel,
  ZEmpty,
  ZQuickCard,
  ZTimeline,
  type ZTimelineItem,
} from "@/components/z";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Painel · Zelar" }] }),
  component: Dashboard,
});

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const BRLshort = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return BRL(v);
};

function pctDelta(arr?: number[]): number | null {
  if (!arr || arr.length < 2) return null;
  const cur = arr[arr.length - 1];
  const prev = arr[arr.length - 2];
  if (!prev) return cur > 0 ? 100 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentTenant?.id, session?.user.id]);

  const { data: series } = useQuery({
    queryKey: ["dashboard-series", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => loadDashboardSeries(currentTenant!.id),
  });

  const { data: congUsage } = useQuery({
    queryKey: ["congregations-usage", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: () => getCongregationsUsage(currentTenant!.id),
  });

  const membersNear = isNearLimit("members");
  const deptsNear = isNearLimit("departments");

  const incomeDelta = pctDelta(series?.income);
  const expenseDelta = pctDelta(series?.expense);
  const balanceDelta = pctDelta(series?.balance);
  const membersDelta = pctDelta(series?.membersCumulative);

  const chartData =
    series?.labels.map((label, i) => ({
      label,
      Receitas: series.income[i],
      Despesas: series.expense[i],
      Membros: series.membersCumulative[i],
    })) ?? [];

  // Timeline: merge recent transactions + upcoming schedules into one feed
  const timeline = useMemo<ZTimelineItem[]>(() => {
    const items: ZTimelineItem[] = [];
    recent.forEach((t) => {
      const isIn = t.type === "entrada" || t.type === "income";
      items.push({
        id: `tx-${t.id}`,
        icon: isIn ? TrendingUp : TrendingDown,
        tone: isIn ? "emerald" : "rose",
        title: t.description ?? (isIn ? "Receita registrada" : "Despesa registrada"),
        description: `${isIn ? "Entrada" : "Saída"} financeira`,
        meta: (
          <span
            className={cn(
              "font-mono text-[11.5px] font-semibold tabular-nums",
              isIn ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {isIn ? "+" : "−"} {BRL(Math.abs(t.amount))}
          </span>
        ),
        timestamp: new Date(t.transaction_date).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        }),
      });
    });
    upcoming.forEach((s) => {
      items.push({
        id: `sch-${s.id}`,
        icon: CalendarDays,
        tone: "navy",
        title: s.title,
        description: s.location ?? "Escala / evento agendado",
        timestamp: new Date(s.starts_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        }),
      });
    });
    return items.slice(0, 10);
  }, [recent, upcoming]);

  return (
    <ZPage>
      <ZPageHeader
        eyebrow="Painel"
        title={`Visão geral · ${currentTenant?.name ?? "Sua igreja"}`}
        description="Indicadores, fluxo de caixa e atividades dos últimos 6 meses."
        actions={
          <>
            <Link
              to="/app/financeiro"
              className="hidden h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex"
            >
              <Wallet className="h-3.5 w-3.5" /> Financeiro
            </Link>
            <Link
              to="/app/relatorios"
              className="inline-flex h-8 items-center gap-1 rounded-md bg-[var(--navy)] px-3 text-[11.5px] font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[var(--navy-mid)]"
            >
              Ver relatórios <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-[12.5px]">Erro ao carregar o uso do plano</AlertTitle>
          <AlertDescription className="text-[11.5px]">{error.message}</AlertDescription>
        </Alert>
      )}
      {(membersNear || deptsNear) && (
        <Alert className="py-2.5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-[12.5px]">Atenção aos limites do plano</AlertTitle>
          <AlertDescription className="text-[11.5px]">
            Você está próximo do limite de{" "}
            {[membersNear && "membros", deptsNear && "departamentos"].filter(Boolean).join(" e ")}.
          </AlertDescription>
        </Alert>
      )}

      {/* Linha 1 — KPIs compactos (5 cards, ~88px altura) */}
      <ZGrid cols={5}>
        <ZKpi
          label="Membros"
          value={loading ? null : (stats?.membersActive ?? 0).toLocaleString("pt-BR")}
          icon={Users}
          tone="navy"
          spark={series?.membersCumulative}
          delta={membersDelta}
          href="/app/members"
          loading={loading}
        />
        <ZKpi
          label="Receita"
          value={loading ? null : BRL(stats?.monthIncome ?? 0)}
          icon={TrendingUp}
          tone="emerald"
          spark={series?.income}
          delta={incomeDelta}
          href="/app/financeiro"
          loading={loading}
        />
        <ZKpi
          label="Despesa"
          value={loading ? null : BRL(stats?.monthExpense ?? 0)}
          icon={TrendingDown}
          tone="rose"
          spark={series?.expense}
          delta={expenseDelta != null ? -expenseDelta : null}
          href="/app/financeiro"
          loading={loading}
        />
        <ZKpi
          label="Saldo"
          value={loading ? null : BRL(stats?.monthBalance ?? 0)}
          icon={Wallet}
          tone={(stats?.monthBalance ?? 0) >= 0 ? "gold" : "rose"}
          spark={series?.balance}
          delta={balanceDelta}
          href="/app/financeiro"
          loading={loading}
        />
        <ZKpi
          label="Escalas (sem)"
          value={loading ? null : stats?.upcomingSchedulesCount ?? 0}
          icon={CalendarDays}
          tone="slate"
          href="/app/escalas"
          loading={loading}
        />
      </ZGrid>

      {/* Linha 2 — 2 gráficos lado a lado, 240px */}
      <div className="grid gap-3 lg:grid-cols-3">
        <ZPanel
          className="lg:col-span-2"
          title="Fluxo de caixa"
          subtitle="Últimos 6 meses"
          icon={Activity}
          action={
            <Link
              to="/app/financeiro"
              className="text-[10.5px] font-semibold text-[var(--navy)] hover:underline"
            >
              Detalhar →
            </Link>
          }
          bodyClassName="px-2 py-2"
        >
          <div className="h-[220px] w-full">
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E11D48" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#E11D48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    tickFormatter={BRLshort}
                    width={52}
                  />
                  <Tooltip
                    cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 8px 24px rgba(15,35,71,0.10)",
                      fontSize: 11,
                      padding: "6px 8px",
                    }}
                    formatter={(v: number) => BRL(v)}
                  />
                  <Area type="monotone" dataKey="Receitas" stroke="#10B981" strokeWidth={2} fill="url(#gIncome)" />
                  <Area type="monotone" dataKey="Despesas" stroke="#E11D48" strokeWidth={2} fill="url(#gExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </ZPanel>

        <ZPanel
          title="Crescimento da igreja"
          subtitle="Membresia acumulada por mês"
          icon={Users}
          bodyClassName="px-2 py-2"
        >
          <div className="h-[220px] w-full">
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(27,58,107,0.04)" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 8px 24px rgba(15,35,71,0.10)",
                      fontSize: 11,
                      padding: "6px 8px",
                    }}
                  />
                  <Bar dataKey="Membros" fill="#1B3A6B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </ZPanel>
      </div>

      {/* Linha 3 — Cards operacionais compactos */}
      <ZGrid cols={4}>
        <ZQuickCard
          icon={CalendarDays}
          label="Próximos eventos"
          value={stats?.upcomingSchedulesCount ?? 0}
          hint="Escalas confirmadas"
          tone="navy"
          href="/app/escalas"
        />
        <ZQuickCard
          icon={ShoppingCart}
          label="Compras pendentes"
          value={stats?.pendingPurchases ?? 0}
          hint="Aguardando aprovação"
          tone="gold"
          href="/app/compras"
        />
        <ZQuickCard
          icon={ClipboardCheck}
          label="Check-ins (7 dias)"
          value={stats?.lastCheckins ?? 0}
          hint="Presenças confirmadas"
          tone="emerald"
          href="/app/checkin"
        />
        <ZQuickCard
          icon={Bell}
          label="Notificações"
          value={stats?.unreadNotifications ?? 0}
          hint="Não lidas"
          tone="rose"
          href="/app/notificacoes"
        />
      </ZGrid>

      {/* Linha 4 — Atividade recente (timeline) + Plano */}
      <div className="grid gap-3 lg:grid-cols-3">
        <ZPanel
          className="lg:col-span-2"
          title="Atividade recente"
          subtitle="Movimentações financeiras e escalas agendadas"
          icon={Activity}
          action={
            <Link
              to="/app/auditoria"
              className="text-[10.5px] font-semibold text-[var(--navy)] hover:underline"
            >
              Auditoria completa →
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <ZEmpty
              icon={Activity}
              title="Nenhuma atividade recente"
              description="Quando houver movimentação financeira ou escalas agendadas, elas aparecerão aqui."
            />
          ) : (
            <ZTimeline items={timeline} />
          )}
        </ZPanel>

        <ZPanel
          title="Plano e capacidade"
          subtitle="Uso atual da assinatura"
          icon={Sparkles}
          action={
            <Link
              to="/app/settings"
              className="text-[10.5px] font-semibold text-[var(--navy)] hover:underline"
            >
              Gerenciar →
            </Link>
          }
        >
          <div className="space-y-3">
            <UsageBar
              label="Membros"
              current={usage?.currentMembers}
              max={usage?.maxMembers}
              loading={planLoading}
              near={membersNear}
            />
            <UsageBar
              label="Departamentos"
              current={usage?.currentDepartments}
              max={usage?.maxDepartments}
              loading={planLoading}
              near={deptsNear}
            />
            <UsageBar
              label="Congregações"
              current={congUsage?.current}
              max={congUsage?.max ?? undefined}
              loading={!congUsage}
              near={false}
              icon={Building2}
            />
          </div>
        </ZPanel>
      </div>
    </ZPage>
  );
}

function UsageBar({
  label,
  current,
  max,
  loading,
  near,
  icon: Icon,
}: {
  label: string;
  current?: number;
  max?: number;
  loading: boolean;
  near: boolean;
  icon?: typeof Users;
}) {
  const pct = max && max > 0 ? Math.min(100, Math.round(((current ?? 0) / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700">
          {Icon && <Icon className="h-3 w-3 text-slate-400" />}
          {label}
        </span>
        {loading ? (
          <Skeleton className="h-3 w-14" />
        ) : (
          <span className="text-[11px] tabular-nums text-slate-500">
            <span className={cn("font-semibold", near ? "text-rose-600" : "text-slate-800")}>
              {current ?? 0}
            </span>
            {max != null && <> / {max}</>}
          </span>
        )}
      </div>
      {!loading && max != null && (
        <Progress value={pct} className={cn("h-1.5", near && "[&>div]:bg-destructive")} />
      )}
    </div>
  );
}
