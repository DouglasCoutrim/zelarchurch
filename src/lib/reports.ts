import { supabase } from "@/integrations/supabase/client";

export interface ConsolidatedReport {
  members: {
    total: number;
    active: number;
    inactive: number;
    newInRange: number;
    byStatus: Record<string, number>;
  };
  finance: {
    receitas: number;
    despesas: number;
    saldo: number;
    pendentes: number;
    transactionCount: number;
  };
  patrimony: {
    total: number;
    totalValue: number;
  };
  schedules: {
    total: number;
    upcoming: number;
    completedInRange: number;
  };
  checkins: {
    total: number;
  };
  minutes: {
    total: number;
    byStatus: Record<string, number>;
  };
  departments: {
    total: number;
    active: number;
  };
}

export async function getConsolidatedReport(
  tenantId: string,
  from: string,
  to: string,
): Promise<ConsolidatedReport> {
  const fromIso = new Date(from + "T00:00:00").toISOString();
  const toIso = new Date(to + "T23:59:59").toISOString();
  const nowIso = new Date().toISOString();

  const [
    membersRes, newMembersRes, txRes, patRes, schRes, upcomingRes,
    checkinsRes, minutesRes, deptRes,
  ] = await Promise.all([
    supabase.from("members").select("status", { count: "exact" })
      .eq("tenant_id", tenantId).is("deleted_at", null),
    supabase.from("members").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).is("deleted_at", null)
      .gte("created_at", fromIso).lte("created_at", toIso),
    supabase.from("transactions").select("type, amount, status")
      .eq("tenant_id", tenantId).is("deleted_at", null)
      .gte("transaction_date", from).lte("transaction_date", to),
    supabase.from("patrimonies").select("acquisition_value, current_value")
      .eq("tenant_id", tenantId).is("deleted_at", null),
    supabase.from("schedules").select("id, starts_at", { count: "exact" })
      .eq("tenant_id", tenantId)
      .gte("starts_at", fromIso).lte("starts_at", toIso),
    supabase.from("schedules").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).gte("starts_at", nowIso),
    supabase.from("checkins").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("checked_in_at", fromIso).lte("checked_in_at", toIso),
    supabase.from("minutes").select("status")
      .eq("tenant_id", tenantId).is("deleted_at", null)
      .gte("meeting_at", fromIso).lte("meeting_at", toIso),
    supabase.from("departments").select("is_active", { count: "exact" })
      .eq("tenant_id", tenantId),
  ]);

  for (const r of [membersRes, newMembersRes, txRes, patRes, schRes, upcomingRes, checkinsRes, minutesRes, deptRes]) {
    if (r.error) throw r.error;
  }

  // Members
  const memberRows = (membersRes.data ?? []) as { status: string }[];
  const byStatus: Record<string, number> = {};
  for (const m of memberRows) byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;

  // Finance
  let receitas = 0, despesas = 0, pendentes = 0;
  const txRows = (txRes.data ?? []) as { type: string; amount: number; status: string }[];
  for (const t of txRows) {
    const v = Number(t.amount) || 0;
    if (t.status === "cancelado") continue;
    if (t.status === "pendente") pendentes += v;
    if (t.type === "receita") receitas += v;
    else despesas += v;
  }

  // Patrimony
  const patRows = (patRes.data ?? []) as { acquisition_value: number | null; current_value: number | null }[];
  const totalValue = patRows.reduce((s, p) => s + Number(p.current_value ?? p.acquisition_value ?? 0), 0);

  // Schedules
  const schRows = (schRes.data ?? []) as { starts_at: string }[];
  const completed = schRows.filter((s) => new Date(s.starts_at).getTime() < Date.now()).length;

  // Minutes
  const minutesRows = (minutesRes.data ?? []) as { status: string }[];
  const minByStatus: Record<string, number> = {};
  for (const m of minutesRows) minByStatus[m.status] = (minByStatus[m.status] ?? 0) + 1;

  // Departments
  const deptRows = (deptRes.data ?? []) as { is_active: boolean }[];

  return {
    members: {
      total: membersRes.count ?? memberRows.length,
      active: byStatus["ativo"] ?? 0,
      inactive: byStatus["inativo"] ?? 0,
      newInRange: newMembersRes.count ?? 0,
      byStatus,
    },
    finance: {
      receitas, despesas, saldo: receitas - despesas, pendentes,
      transactionCount: txRows.length,
    },
    patrimony: {
      total: patRows.length,
      totalValue,
    },
    schedules: {
      total: schRes.count ?? schRows.length,
      upcoming: upcomingRes.count ?? 0,
      completedInRange: completed,
    },
    checkins: { total: checkinsRes.count ?? 0 },
    minutes: { total: minutesRows.length, byStatus: minByStatus },
    departments: {
      total: deptRes.count ?? deptRows.length,
      active: deptRows.filter((d) => d.is_active).length,
    },
  };
}
