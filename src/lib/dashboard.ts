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
  occurred_at: string;
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
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
      .gte("occurred_at", from)
      .lte("occurred_at", to),
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
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("transactions")
      .select("id,description,amount,type,occurred_at")
      .eq("tenant_id", tenantId)
      .order("occurred_at", { ascending: false })
      .limit(5),
  ]);

  let monthIncome = 0;
  let monthExpense = 0;
  (txRes.data ?? []).forEach((t: { amount: number | string; type: string }) => {
    const v = Number(t.amount) || 0;
    if (t.type === "entrada" || t.type === "income") monthIncome += v;
    else monthExpense += v;
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
