import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Wallet, Boxes, CalendarDays, ClipboardCheck, FileText, Building2,
  TrendingUp, TrendingDown, Download,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { getConsolidatedReport } from "@/lib/reports";
import { getMonthlyReport } from "@/lib/finance";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios" }] }),
  component: ReportsPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function firstOfYear() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

function ReportsPage() {
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const [from, setFrom] = useState(firstOfYear());
  const [to, setTo] = useState(today());

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["report-consolidated", currentTenant?.id, from, to],
    enabled: !!currentTenant?.id,
    queryFn: () => getConsolidatedReport(currentTenant!.id, from, to),
  });

  const { data: monthly } = useQuery({
    queryKey: ["report-monthly", currentTenant?.id, from, to],
    enabled: !!currentTenant?.id,
    queryFn: () => getMonthlyReport(currentTenant!.id, from, to),
  });

  const monthlyFmt = useMemo(
    () => (monthly ?? []).map((m) => ({
      ...m,
      saldo: m.receitas - m.despesas,
      label: m.month.split("-").reverse().join("/"),
    })),
    [monthly],
  );

  function exportCsv() {
    if (!data) return;
    const rows: string[][] = [
      ["Relatório consolidado", `${from} a ${to}`],
      [],
      ["Membros", "Total", String(data.members.total)],
      ["", "Ativos", String(data.members.active)],
      ["", "Inativos", String(data.members.inactive)],
      ["", "Novos no período", String(data.members.newInRange)],
      [],
      ["Financeiro", "Receitas", String(data.finance.receitas.toFixed(2))],
      ["", "Despesas", String(data.finance.despesas.toFixed(2))],
      ["", "Saldo", String(data.finance.saldo.toFixed(2))],
      ["", "Pendentes", String(data.finance.pendentes.toFixed(2))],
      ["", "Transações", String(data.finance.transactionCount)],
      [],
      ["Patrimônio", "Itens", String(data.patrimony.total)],
      ["", "Valor total", String(data.patrimony.totalValue.toFixed(2))],
      [],
      ["Escalas no período", String(data.schedules.total)],
      ["Eventos futuros", String(data.schedules.upcoming)],
      ["Check-ins no período", String(data.checkins.total)],
      [],
      ["Atas no período", String(data.minutes.total)],
      ["Departamentos ativos", String(data.departments.active)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-${from}-a-${to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Análises"
        title="Relatórios consolidados"
        description="Visão geral de todos os módulos no período selecionado."
        actions={
          <>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
            </div>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Atualizando..." : "Atualizar"}
            </Button>
            <Button onClick={exportCsv} disabled={!data}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={<Users className="h-4 w-4" />} label="Membros ativos"
              value={String(data.members.active)}
              hint={`${data.members.newInRange} novos no período`} />
            <KpiCard icon={<Wallet className="h-4 w-4" />} label="Saldo no período"
              value={BRL(data.finance.saldo)}
              hint={data.finance.saldo >= 0 ? "Resultado positivo" : "Resultado negativo"}
              positive={data.finance.saldo >= 0} />
            <KpiCard icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Receitas"
              value={BRL(data.finance.receitas)} hint={`${data.finance.transactionCount} transações`} />
            <KpiCard icon={<TrendingDown className="h-4 w-4 text-rose-600" />} label="Despesas"
              value={BRL(data.finance.despesas)}
              hint={data.finance.pendentes > 0 ? `${BRL(data.finance.pendentes)} pendentes` : "Sem pendências"} />
            <KpiCard icon={<Boxes className="h-4 w-4" />} label="Patrimônio"
              value={String(data.patrimony.total)} hint={BRL(data.patrimony.totalValue)} />
            <KpiCard icon={<CalendarDays className="h-4 w-4" />} label="Escalas no período"
              value={String(data.schedules.total)} hint={`${data.schedules.upcoming} futuras`} />
            <KpiCard icon={<ClipboardCheck className="h-4 w-4" />} label="Check-ins"
              value={String(data.checkins.total)} hint="No período" />
            <KpiCard icon={<FileText className="h-4 w-4" />} label="Atas"
              value={String(data.minutes.total)} hint={`${data.departments.active} deptos. ativos`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Receitas vs Despesas (mensal)</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                {monthlyFmt.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyFmt}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => BRL(v)} />
                      <Legend />
                      <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--primary))" />
                      <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Saldo mensal</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                {monthlyFmt.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyFmt}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => BRL(v)} />
                      <Line type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <BreakdownCard icon={<Users className="h-4 w-4" />} title="Membros por status"
              entries={Object.entries(data.members.byStatus)} />
            <BreakdownCard icon={<FileText className="h-4 w-4" />} title="Atas por status"
              entries={Object.entries(data.minutes.byStatus)} emptyMsg="Nenhuma ata no período" />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> Organização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Departamentos ativos" value={`${data.departments.active} / ${data.departments.total}`} />
                <Row label="Membros totais" value={String(data.members.total)} />
                <Row label="Inativos" value={String(data.members.inactive)} />
                <Row label="Itens patrimoniais" value={String(data.patrimony.total)} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon, label, value, hint, positive,
}: {
  icon: React.ReactNode; label: string; value: string; hint?: string; positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon} {label}
        </div>
        <div className={`mt-2 text-2xl font-semibold tabular-nums ${
          positive === false ? "text-rose-600" : ""
        }`}>{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  icon, title, entries, emptyMsg,
}: {
  icon: React.ReactNode; title: string;
  entries: [string, number][]; emptyMsg?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMsg ?? "Sem dados."}</p>
        ) : entries.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <Badge variant="outline" className="capitalize">{k.replace(/_/g, " ")}</Badge>
            <span className="tabular-nums font-medium">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Sem dados no período.
    </div>
  );
}
