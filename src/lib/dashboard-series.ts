import { supabase } from "@/integrations/supabase/client";

export interface MonthlySeries {
  labels: string[]; // "Jan", "Fev", …
  income: number[];
  expense: number[];
  balance: number[];
  membersCumulative: number[];
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Pulls the last 6 calendar months of finance activity + member creation
 * to power the dashboard sparklines / area charts.
 */
export async function loadDashboardSeries(tenantId: string): Promise<MonthlySeries> {
  const months: { key: string; label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: monthKey(d),
      label: MONTH_LABEL[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  const from = new Date(months[0].year, months[0].month, 1).toISOString().slice(0, 10);

  const [txRes, membersRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount,type,transaction_date")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .gte("transaction_date", from),
    supabase
      .from("members")
      .select("created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", from),
  ]);

  const income = months.map(() => 0);
  const expense = months.map(() => 0);
  (txRes.data ?? []).forEach((t: { amount: number | string; type: string; transaction_date: string }) => {
    const d = new Date(t.transaction_date);
    const key = monthKey(d);
    const idx = months.findIndex((m) => m.key === key);
    if (idx === -1) return;
    const v = Number(t.amount) || 0;
    if (t.type === "entrada" || t.type === "income") income[idx] += v;
    else expense[idx] += v;
  });

  const balance = income.map((v, i) => v - expense[i]);

  const perMonth = months.map(() => 0);
  (membersRes.data ?? []).forEach((m: { created_at: string }) => {
    const d = new Date(m.created_at);
    const key = monthKey(d);
    const idx = months.findIndex((mk) => mk.key === key);
    if (idx !== -1) perMonth[idx]++;
  });
  const membersCumulative: number[] = [];
  let acc = 0;
  for (const v of perMonth) {
    acc += v;
    membersCumulative.push(acc);
  }

  return {
    labels: months.map((m) => m.label),
    income,
    expense,
    balance,
    membersCumulative,
  };
}
