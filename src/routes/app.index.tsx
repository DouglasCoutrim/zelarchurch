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
  Legend,
} from "recharts";

import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  ZCard,
  ZStatus,
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

  const enabledFeatures = usage
    ? Object.entries(usage.features).filter(([, on]) => on).map(([k]) => k)
    : [];
  const membersNear = isNearLimit("members");
  const deptsNear = isNearLimit("departments");

  // deltas (mês atual vs anterior)
  const incomeDelta = pctDelta(series?.income);
  const expenseDelta = pctDelta(series?.expense);
  const balanceDelta = pctDelta(series?.balance);
  const membersDelta = pctDelta(series?.membersCumulative);

  const chartData =
    series?.labels.map((label, i) => ({
      label,
      Receitas: series.income[i],
      Despesas: series.expense[i],
      Saldo: series.balance[i],
      Membros: series.membersCumulative[i],
    })) ?? [];

  return (
    <ZPage>
      <ZPageHeader
        eyebrow="Painel"
        title="Visão geral"
        description={`Resumo operacional de ${currentTenant?.name ?? "sua área de trabalho"} — últimos 6 meses.`}
        actions={
          <Link
            to="/app/relatorios"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--navy)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[var(--navy-mid)]"
          >
            Ver relatórios <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

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
          </AlertDescription>
        </Alert>
      )}

      {/* Linha 1 — KPIs com sparkline e delta */}
      <ZSection title="Indicadores do mês" hint="vs. mês anterior">
        <ZGrid cols={4}>
          <ZKpi
            label="Membros ativos"
            value={loading ? null : (stats?.membersActive ?? 0).toLocaleString("pt-BR")}
            icon={Users}
            tone="navy"
            spark={series?.membersCumulative}
            delta={membersDelta}
            href="/app/members"
            loading={loading}
          />
          <ZKpi
            label="Receita do mês"
            value={loading ? null : BRL(stats?.monthIncome ?? 0)}
            icon={TrendingUp}
            tone="emerald"
            spark={series?.income}
            delta={incomeDelta}
            href="/app/financeiro"
            loading={loading}
          />
          <ZKpi
            label="Despesa do mês"
            value={loading ? null : BRL(stats?.monthExpense ?? 0)}
            icon={TrendingDown}
            tone="rose"
            spark={series?.expense}
            delta={expenseDelta != null ? -expenseDelta : null}
            href="/app/financeiro"
            loading={loading}
          />
          <ZKpi
            label="Saldo do mês"
            value={loading ? null : BRL(stats?.monthBalance ?? 0)}
            icon={Wallet}
            tone={(stats?.monthBalance ?? 0) >= 0 ? "gold" : "rose"}
            spark={series?.balance}
            delta={balanceDelta}
            href="/app/financeiro"
            loading={loading}
          />
        </ZGrid>
      </ZSection>

      {/* Linha 2 — Gráficos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ZPanel
          className="lg:col-span-2"
          title="Fluxo de caixa"
          subtitle="Receitas e despesas dos últimos 6 meses"
          icon={Activity}
          action={
            <Link
              to="/app/financeiro"
              className="text-[11px] font-semibold text-[var(--navy)] hover:underline"
            >
              Detalhar →
            </Link>
          }
        >
          <div className="h-64 w-full">
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
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
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    tickFormatter={BRLshort}
                    width={60}
                  />
                  <Tooltip
                    cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 8px 24px rgba(15,35,71,0.08)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => BRL(v)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Area
                    type="monotone"
                    dataKey="Receitas"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#gIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Despesas"
                    stroke="#E11D48"
                    strokeWidth={2}
                    fill="url(#gExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </ZPanel>

        <ZPanel
          title="Crescimento da membresia"
          subtitle="Total acumulado por mês"
          icon={Users}
        >
          <div className="h-64 w-full">
            {series ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(27,58,107,0.04)" }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 8px 24px rgba(15,35,71,0.08)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="Membros" fill="#1B3A6B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </ZPanel>
      </div>

      {/* Linha 3 — Mini stats operacionais */}
      <ZSection title="Operação rápida">
        <ZGrid cols={4}>
          <MiniStat to="/app/escalas" label="Próximas escalas" value={stats?.upcomingSchedulesCount ?? 0} icon={CalendarDays} />
          <MiniStat to="/app/compras" label="Compras pendentes" value={stats?.pendingPurchases ?? 0} icon={ShoppingCart} />
          <MiniStat to="/app/checkin" label="Check-ins (7 dias)" value={stats?.lastCheckins ?? 0} icon={ClipboardCheck} />
          <MiniStat to="/app/notificacoes" label="Notificações" value={stats?.unreadNotifications ?? 0} icon={Bell} />
        </ZGrid>
      </ZSection>

      {/* Linha 4 — Listas */}
      <ZSection title="Atividade recente">
        <div className="grid gap-4 lg:grid-cols-2">
          <ZPanel
            title="Próximas escalas"
            subtitle="Eventos e cultos agendados"
            icon={CalendarDays}
            action={
              <Link to="/app/escalas" className="text-[11px] font-semibold text-[var(--navy)] hover:underline">
                Ver todas →
              </Link>
            }
          >
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : upcoming.length === 0 ? (
              <ZEmpty
                icon={CalendarDays}
                title="Nenhuma escala futura"
                description="Quando você criar escalas, os próximos eventos aparecerão aqui."
              />
            ) : (
              <ul className="-mx-2 divide-y divide-slate-100">
                {upcoming.map((s) => (
                  <li
                    key={s.id}
                    className="group flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <DateChip iso={s.starts_at} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{s.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {new Date(s.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {s.location && ` • ${s.location}`}
                        </p>
                      </div>
                    </div>
                    <ZStatus tone="info" dot>Agendado</ZStatus>
                  </li>
                ))}
              </ul>
            )}
          </ZPanel>

          <ZPanel
            title="Movimentações recentes"
            subtitle="Últimas entradas e saídas"
            icon={Wallet}
            action={
              <Link to="/app/financeiro" className="text-[11px] font-semibold text-[var(--navy)] hover:underline">
                Ver financeiro →
              </Link>
            }
          >
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : recent.length === 0 ? (
              <ZEmpty
                icon={Wallet}
                title="Sem movimentações"
                description="Quando registrar receitas ou despesas, elas aparecerão aqui."
              />
            ) : (
              <ul className="-mx-2 divide-y divide-slate-100">
                {recent.map((t) => {
                  const isIn = t.type === "entrada" || t.type === "income";
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                            isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
                          )}
                        >
                          {isIn ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {t.description ?? "(sem descrição)"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(t.transaction_date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-sm font-semibold tabular-nums",
                          isIn ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {isIn ? "+" : "−"} {BRL(Math.abs(t.amount))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </ZPanel>
        </div>
      </ZSection>

      {/* Linha 5 — Plano */}
      <ZSection title="Plano e capacidade">
        <ZGrid cols={4}>
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
          <ZCard>
            <div className="space-y-3 p-5">
              <MiniHeader icon={Building2} title="Congregações" subtitle="Filiais vinculadas" />
              {!congUsage ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className="text-[22px] font-bold tracking-tight text-slate-900">
                    {congUsage.max === null
                      ? `${congUsage.current}`
                      : `${congUsage.current} / ${congUsage.max}`}
                  </p>
                  <Link
                    to="/app/congregations"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--navy)] hover:underline"
                  >
                    Gerenciar <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </>
              )}
            </div>
          </ZCard>
          <ZCard>
            <div className="space-y-3 p-5">
              <MiniHeader icon={Sparkles} title="Plano" subtitle="Recursos disponíveis" />
              {planLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : enabledFeatures.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum recurso ativo.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {enabledFeatures.slice(0, 6).map((f) => (
                    <Badge key={f} variant="secondary" className="font-medium">
                      {f}
                    </Badge>
                  ))}
                  {enabledFeatures.length > 6 && (
                    <Badge variant="secondary" className="font-medium">+{enabledFeatures.length - 6}</Badge>
                  )}
                </div>
              )}
            </div>
          </ZCard>
        </ZGrid>
      </ZSection>
    </ZPage>
  );
}

/* ── helpers ─────────────────────────────────────────── */

function pctDelta(arr?: number[]): number | null {
  if (!arr || arr.length < 2) return null;
  const cur = arr[arr.length - 1];
  const prev = arr[arr.length - 2];
  if (!prev) return cur > 0 ? 100 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function DateChip({ iso }: { iso: string }) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"][d.getMonth()];
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-center">
      <div>
        <div className="text-[9px] font-bold leading-none text-[var(--navy)]">{mon}</div>
        <div className="text-sm font-bold leading-none text-slate-900">{day}</div>
      </div>
    </div>
  );
}

function MiniHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Users;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
    </div>
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
      <ZCard interactive className="h-full">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">{value}</p>
          </div>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </ZCard>
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
    <ZCard>
      <div className="space-y-3 p-5">
        <MiniHeader icon={Icon} title={title} subtitle={description} />
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-2 w-full" />
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-bold tracking-tight text-slate-900">{current ?? 0}</span>
              <span className="text-sm text-slate-500">/ {max ?? 0}</span>
            </div>
            <Progress value={pct} className={cn(near && "[&>div]:bg-destructive")} />
            <p className="text-xs text-slate-500">{pct}% utilizado</p>
          </>
        )}
      </div>
    </ZCard>
  );
}
