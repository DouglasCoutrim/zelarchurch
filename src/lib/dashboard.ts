import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
  membersActive: number;
  upcomingSchedulesCount: number;
  pendingPurchases: number;
  unreadNotifications: number;
  lastCheckins: number;
}

export interface UpcomingSchedule {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
}

export interface RecentTransaction {
  id: string;
  description: string | null;
  amount: number;
  type: string;
  transaction_date: string;
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const from = `${y}-${pad(m + 1)}-01`;
  const to = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { from, to };
}

export async function loadDashboard(tenantId: string, userId: string): Promise<{
  stats: DashboardStats;
  upcoming: UpcomingSchedule[];
  recent: RecentTransaction[];
}> {
  const { from, to } = monthRange();
  const nowIso = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    txRes,
    membersRes,
    upcomingRes,
    purchasesRes,
    notifRes,
    checkinsRes,
    recentTxRes,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount,type")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .gte("transaction_date", from)
      .lte("transaction_date", to),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "ativo"),
    supabase
      .from("schedules")
      .select("id,title,starts_at,location")
      .eq("tenant_id", tenantId)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase
      .from("purchase_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "aguardando")
      .is("deleted_at", null),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("read_at", null),
    supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("checked_in_at", sevenDaysAgo),
    supabase
      .from("transactions")
      .select("id,description,amount,type,transaction_date")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .limit(5),
  ]);

  let monthIncome = 0;
  let monthExpense = 0;
  (txRes.data ?? []).forEach((t: { amount: number | string; type: string }) => {
    const v = Number(t.amount) || 0;
    if (t.type === "receita") monthIncome += v;
    else if (t.type === "despesa") monthExpense += v;
  });

  return {
    stats: {
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      membersActive: membersRes.count ?? 0,
      upcomingSchedulesCount: upcomingRes.data?.length ?? 0,
      pendingPurchases: purchasesRes.count ?? 0,
      unreadNotifications: notifRes.count ?? 0,
      lastCheckins: checkinsRes.count ?? 0,
    },
    upcoming: (upcomingRes.data ?? []) as UpcomingSchedule[],
    recent: (recentTxRes.data ?? []).map((r) => ({
      ...r,
      amount: Number(r.amount) || 0,
    })) as RecentTransaction[],
  };
}
