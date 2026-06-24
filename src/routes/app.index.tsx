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
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { usePlanLimit } from "@/hooks/usePlanLimit";
import { useTenantStore } from "@/stores/tenantStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getCongregationsUsage } from "@/lib/congregations";
import {
  loadDashboard,
  type DashboardStats,
  type RecentTransaction,
  type UpcomingSchedule,
} from "@/lib/dashboard";

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
      .catch(() => {})
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Painel"
        title="Visão geral"
        description={`Resumo operacional de ${currentTenant?.name ?? "sua área de trabalho"}.`}
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

      {/* Linha 1 — KPIs principais */}
      <Section title="Indicadores do mês" hint="Atualizado em tempo real">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Membros ativos"
            value={loading ? null : (stats?.membersActive ?? 0).toLocaleString("pt-BR")}
            icon={Users}
            tone="navy"
            href="/app/members"
          />
          <Kpi
            label="Receita do mês"
            value={loading ? null : BRL(stats?.monthIncome ?? 0)}
            icon={TrendingUp}
            tone="emerald"
            href="/app/financeiro"
          />
          <Kpi
            label="Despesa do mês"
            value={loading ? null : BRL(stats?.monthExpense ?? 0)}
            icon={TrendingDown}
            tone="rose"
            href="/app/financeiro"
          />
          <Kpi
            label="Saldo atual"
            value={loading ? null : BRL(stats?.monthBalance ?? 0)}
            icon={Wallet}
            tone={(stats?.monthBalance ?? 0) >= 0 ? "gold" : "rose"}
            href="/app/financeiro"
          />
        </div>
      </Section>

      {/* Linha 2 — Mini stats operacionais */}
      <Section title="Operação" hint="Eventos e atividades">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            label="Não lidas"
            value={stats?.unreadNotifications ?? 0}
            icon={Bell}
          />
        </div>
      </Section>

      {/* Linha 3 — Listas */}
      <Section title="Próximas atividades">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Próximas escalas"
            subtitle="Eventos e cultos agendados"
            href="/app/escalas"
            hrefLabel="Ver todas"
          >
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : upcoming.length === 0 ? (
              <EmptyState
                compact
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
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--navy-light)] text-[var(--navy)]">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{s.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {new Date(s.starts_at).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                          {s.location && ` • ${s.location}`}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--navy)]" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Movimentações recentes"
            subtitle="Últimas entradas e saídas"
            href="/app/financeiro"
            hrefLabel="Ver financeiro"
          >
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : recent.length === 0 ? (
              <EmptyState
                compact
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
                            isIn
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-rose-50 text-rose-600",
                          )}
                        >
                          {isIn ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
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
          </Panel>
        </div>
      </Section>

      {/* Linha 4 — Plano */}
      <Section title="Plano e capacidade">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <CardContent className="space-y-3 p-5">
              <Header icon={Building2} title="Congregações" subtitle="Filiais vinculadas" />
              {!congUsage ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">
                    {congUsage.max === null
                      ? `${congUsage.current} (ilimitado)`
                      : `${congUsage.current} de ${congUsage.max}`}
                  </p>
                  <Link
                    to="/app/congregations"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--navy)] hover:underline"
                  >
                    Gerenciar <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              <Header icon={Sparkles} title="Plano" subtitle="Recursos disponíveis" />
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
                    <Badge variant="secondary" className="font-medium">
                      +{enabledFeatures.length - 6}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}

/* ── primitives ───────────────────────────────────────── */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Header({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
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

const TONES = {
  navy: "bg-[var(--navy-light)] text-[var(--navy)]",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  gold: "bg-[var(--gold-light)] text-[var(--gold-dark)]",
} as const;

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "navy",
  href,
}: {
  label: string;
  value: string | null;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  href?: string;
}) {
  const inner = (
    <Card className="group h-full transition-all hover:-translate-y-0.5">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          {value === null ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className="truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          )}
          {href && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--navy)] opacity-0 transition-opacity group-hover:opacity-100">
              Abrir <ArrowUpRight className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
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
  icon: LucideIcon;
}) {
  return (
    <Link to={to}>
      <Card className="h-full transition-all hover:-translate-y-0.5">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">{value}</p>
          </div>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Panel({
  title,
  subtitle,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {href && hrefLabel && (
            <Link
              to={href}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--navy)] hover:underline"
            >
              {hrefLabel} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
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
  icon: LucideIcon;
  current?: number;
  max?: number;
  loading: boolean;
  near: boolean;
}) {
  const pct = max && max > 0 ? Math.min(100, Math.round(((current ?? 0) / max) * 100)) : 0;
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <Header icon={Icon} title={title} subtitle={description} />
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-2 w-full" />
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">{current ?? 0}</span>
              <span className="text-sm text-slate-500">/ {max ?? 0}</span>
            </div>
            <Progress value={pct} className={cn(near && "[&>div]:bg-destructive")} />
            <p className="text-xs text-slate-500">{pct}% utilizado</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
