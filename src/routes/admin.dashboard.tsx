import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Admin Zelar" }] }),
  component: AdminDashboard,
});

interface DashboardStats {
  kpis: {
    total_tenants: number;
    active_month: number;
    in_trial: number;
    mrr: number;
  };
  new_tenants_per_month: { month: string; label: string; count: number }[];
  plan_distribution: { slug: string; name: string; count: number }[];
  revenue_last_6_months: { month: string; label: string; total: number }[];
  latest_tenants: {
    id: string;
    name: string;
    status: string;
    created_at: string;
    plan_name: string | null;
    plan_slug: string | null;
  }[];
  trials_expiring_7d: {
    id: string;
    name: string;
    trial_ends_at: string;
    email: string | null;
    plan_name: string | null;
    days_left: number;
  }[];
  generated_at: string;
}

async function fetchStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
  if (error) throw error;
  return data as unknown as DashboardStats;
}

const PLAN_COLORS: Record<string, string> = {
  basico: "#94a3b8",
  plus: "#1E3A5F",
  premium: "#C8963E",
  enterprise: "#0f766e",
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdminDashboard() {
  const qc = useQueryClient();
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: fetchStats,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const extend = useMutation({
    mutationFn: async (vars: { id: string; days: number }) => {
      const { error } = await supabase.rpc("admin_extend_trial", {
        _tenant_id: vars.id,
        _days: vars.days,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trial estendido com sucesso");
      qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_convert_trial", {
        _tenant_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Igreja convertida para plano ativo");
      qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const kpis = data?.kpis;
  const cards = [
    {
      label: "Total de Igrejas",
      value: kpis?.total_tenants ?? 0,
      icon: Building2,
      tone: "text-primary",
      hint: "Cadastradas no SaaS",
    },
    {
      label: "Ativas este mês",
      value: kpis?.active_month ?? 0,
      icon: Activity,
      tone: "text-brand-emerald",
      hint: "Com atividade em " + format(new Date(), "MMMM", { locale: ptBR }),
    },
    {
      label: "Em Trial",
      value: kpis?.in_trial ?? 0,
      icon: Clock,
      tone: "text-brand-gold",
      hint: "Período de 14 dias",
    },
    {
      label: "MRR",
      value: brl(kpis?.mrr ?? 0),
      icon: Wallet,
      tone: "text-primary",
      hint: "Receita recorrente mensal",
      isMoney: true,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-gold">
            Painel administrativo
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Visão geral do SaaS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas operacionais do Zelar — atualizadas automaticamente a cada 60s.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`h-2 w-2 rounded-full ${
              isFetching ? "animate-pulse bg-brand-gold" : "bg-brand-emerald"
            }`}
          />
          {isFetching ? "Atualizando..." : "Ao vivo"}
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Erro ao carregar estatísticas: {(error as Error).message}
          </CardContent>
        </Card>
      ) : null}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone, hint, isMoney }) => (
          <Card key={label} className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className={`h-5 w-5 ${tone}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">
                {isLoading
                  ? "…"
                  : isMoney
                    ? value
                    : (value as number).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Novas Igrejas por Mês
              <span className="text-xs font-normal text-muted-foreground">
                (últimos 12 meses)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.new_tenants_per_month ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#1E3A5F"
                  radius={[6, 6, 0, 0]}
                  name="Novas igrejas"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.plan_distribution ?? []}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {(data?.plan_distribution ?? []).map((p) => (
                    <Cell
                      key={p.slug}
                      fill={PLAN_COLORS[p.slug] ?? "#1E3A5F"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {(data?.plan_distribution ?? []).map((p) => (
                <div key={p.slug} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: PLAN_COLORS[p.slug] ?? "#1E3A5F" }}
                  />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">({p.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-brand-gold" />
            Faturamento Mensal
            <span className="text-xs font-normal text-muted-foreground">
              (últimos 6 meses)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.revenue_last_6_months ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickFormatter={(v) => brl(v).replace("R$", "R$ ")}
              />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#C8963E"
                strokeWidth={3}
                dot={{ r: 4, fill: "#C8963E" }}
                activeDot={{ r: 6 }}
                name="Receita"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabelas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Últimas Igrejas Cadastradas</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/tenants">
                Ver todas <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.latest_tenants ?? []).length === 0 && !isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma igreja cadastrada ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.latest_tenants ?? []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.plan_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(new Date(t.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-brand-gold" />
              Trials Expirando (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.trials_expiring_7d ?? []).length === 0 && !isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum trial expirando nos próximos 7 dias.
              </p>
            ) : (
              (data?.trials_expiring_7d ?? []).map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.plan_name ?? "Sem plano"} •{" "}
                      <span className="text-brand-gold">
                        {t.days_left <= 0
                          ? "expira hoje"
                          : `${t.days_left} dia(s) restantes`}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={extend.isPending}
                      onClick={() => extend.mutate({ id: t.id, days: 7 })}
                    >
                      <Clock className="mr-1 h-3.5 w-3.5" />
                      +7 dias
                    </Button>
                    <Button
                      size="sm"
                      disabled={convert.isPending}
                      onClick={() => convert.mutate(t.id)}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Converter
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Ativo", className: "bg-emerald-100 text-emerald-700" },
    trial: { label: "Trial", className: "bg-amber-100 text-amber-700" },
    suspended: { label: "Suspenso", className: "bg-orange-100 text-orange-700" },
    canceled: { label: "Cancelado", className: "bg-red-100 text-red-700" },
  };
  const cfg = map[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return (
    <Badge variant="secondary" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}
