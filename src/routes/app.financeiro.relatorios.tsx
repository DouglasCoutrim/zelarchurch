import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getMonthlyReport, getAccountBreakdown, getFinanceSummary,
} from "@/lib/finance";
import { listCongregations } from "@/lib/congregations";
import { useTenantStore } from "@/stores/tenantStore";
import { formatBRL } from "@/lib/plans";

export const Route = createFileRoute("/app/financeiro/relatorios")({
  component: ReportsPage,
});

function startOfYearISO() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function ReportsPage() {
  const tenant = useTenantStore((s) => s.currentTenant);
  const [from, setFrom] = useState<string>(startOfYearISO());
  const [to, setTo] = useState<string>(todayISO());
  const [congregation, setCongregation] = useState<string>("all");
  const congregationId = congregation === "all" ? null : congregation;

  const congregationsQ = useQuery({
    queryKey: ["congregations", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: () => listCongregations(tenant!.id),
  });

  const summary = useQuery({
    queryKey: ["finance-summary", tenant?.id, { from, to, congregationId }],
    enabled: !!tenant?.id,
    queryFn: () => getFinanceSummary(tenant!.id, from, to, congregationId),
  });
  const monthly = useQuery({
    queryKey: ["finance-monthly", tenant?.id, { from, to, congregationId }],
    enabled: !!tenant?.id,
    queryFn: () => getMonthlyReport(tenant!.id, from, to, congregationId),
  });
  const breakdown = useQuery({
    queryKey: ["finance-breakdown", tenant?.id, { from, to, congregationId }],
    enabled: !!tenant?.id,
    queryFn: () => getAccountBreakdown(tenant!.id, from, to, congregationId),
  });

  const receitas = useMemo(
    () => (breakdown.data ?? []).filter((r) => r.type === "receita"),
    [breakdown.data],
  );
  const despesas = useMemo(
    () => (breakdown.data ?? []).filter((r) => r.type === "despesa"),
    [breakdown.data],
  );

  const monthlyChart = (monthly.data ?? []).map((p) => ({
    ...p,
    saldo: p.receitas - p.despesas,
    label: new Date(p.month + "-01").toLocaleDateString("pt-BR", {
      month: "short", year: "2-digit",
    }),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Receitas" value={summary.data?.receitas ?? 0} tone="emerald" />
        <SummaryCard label="Despesas" value={summary.data?.despesas ?? 0} tone="rose" />
        <SummaryCard label="Saldo" value={summary.data?.saldo ?? 0} tone="primary" />
        <SummaryCard label="Pendente" value={summary.data?.pendente ?? 0} tone="amber" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {monthly.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : monthlyChart.length === 0 ? (
            <p className="grid h-full place-items-center text-sm text-muted-foreground">
              Sem lançamentos no período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="#059669" />
                <Bar dataKey="despesas" name="Despesas" fill="#e11d48" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo acumulado</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {monthlyChart.length === 0 ? (
            <p className="grid h-full place-items-center text-sm text-muted-foreground">
              Sem dados.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Line type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownTable title="Receitas por conta" rows={receitas} tone="receita" />
        <BreakdownTable title="Despesas por conta" rows={despesas} tone="despesa" />
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, tone,
}: { label: string; value: number; tone: "emerald" | "rose" | "primary" | "amber" }) {
  const cls = {
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    primary: "text-primary",
    amber: "text-amber-600",
  }[tone];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${cls}`}>{formatBRL(value)}</div>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  title, rows, tone,
}: {
  title: string;
  rows: { account_name: string; total: number }[];
  tone: "receita" | "despesa";
}) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant="secondary">{formatBRL(total)}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
                <TableHead className="w-20 text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.account_name}</TableCell>
                  <TableCell
                    className={`text-right font-mono ${tone === "receita" ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {formatBRL(r.total)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {total > 0 ? `${((r.total / total) * 100).toFixed(1)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
