import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { listDepartments } from "@/lib/departments";
import { useTenantStore } from "@/stores/tenantStore";

export const Route = createFileRoute("/app/escalas-relatorios")({
  head: () => ({ meta: [{ title: "Relatórios de Escalas" }] }),
  component: ReportsPage,
});

interface Row {
  member_id: string;
  full_name: string;
  scheduled: number;
  attended: number;
  rate: number;
}

function ReportsPage() {
  const tenant = useTenantStore((s) => s.currentTenant);
  const [departmentId, setDepartmentId] = useState<string>("");
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const depsQ = useQuery({
    queryKey: ["departments", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: () => listDepartments(tenant!.id),
  });

  const reportQ = useQuery({
    queryKey: ["attendance", departmentId, from, to],
    enabled: !!departmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_members")
        .select("member_id, attended, member:members!inner(full_name), schedule:schedules!inner(department_id, starts_at, status)")
        .eq("schedule.department_id", departmentId)
        .gte("schedule.starts_at", `${from}T00:00:00`)
        .lte("schedule.starts_at", `${to}T23:59:59`);
      if (error) throw error;
      const map = new Map<string, Row>();
      for (const r of (data ?? []) as { member_id: string; attended: boolean | null; member: { full_name: string } | { full_name: string }[] }[]) {
        const m = Array.isArray(r.member) ? r.member[0] : r.member;
        const cur = map.get(r.member_id) ?? {
          member_id: r.member_id, full_name: m?.full_name ?? "",
          scheduled: 0, attended: 0, rate: 0,
        };
        cur.scheduled += 1;
        if (r.attended) cur.attended += 1;
        map.set(r.member_id, cur);
      }
      const rows = Array.from(map.values());
      rows.forEach((r) => { r.rate = r.scheduled ? (r.attended / r.scheduled) * 100 : 0; });
      rows.sort((a, b) => b.rate - a.rate);
      return rows;
    },
  });

  function exportCsv() {
    const rows = reportQ.data ?? [];
    const csv = ["Membro,Designadas,Presenças,Assiduidade %"]
      .concat(rows.map((r) => `${r.full_name},${r.scheduled},${r.attended},${r.rate.toFixed(1)}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `assiduidade_${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios de Escalas</h1>
        <p className="text-sm text-muted-foreground">Assiduidade dos membros por departamento.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Departamento</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {(depsQ.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!reportQ.data?.length}>
          Exportar CSV
        </Button>
      </div>

      {!departmentId ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecione um departamento.
        </CardContent></Card>
      ) : (reportQ.data ?? []).length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sem dados no período.
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Mais assíduos</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(reportQ.data ?? []).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="full_name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead className="text-right">Designadas</TableHead>
                    <TableHead className="text-right">Presenças</TableHead>
                    <TableHead className="text-right">Assiduidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reportQ.data ?? []).map((r) => (
                    <TableRow key={r.member_id}>
                      <TableCell>{r.full_name}</TableCell>
                      <TableCell className="text-right">{r.scheduled}</TableCell>
                      <TableCell className="text-right">{r.attended}</TableCell>
                      <TableCell className="text-right">{r.rate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
