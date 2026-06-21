import { supabase } from "@/integrations/supabase/client";

export interface AuditLogRow {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  diff: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditFilters {
  entity?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function listAuditLogs(
  tenantId: string,
  filters: AuditFilters = {},
): Promise<AuditLogRow[]> {
  let q = supabase
    .from("audit_logs")
    .select("id,tenant_id,user_id,entity,entity_id,action,diff,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);
  if (filters.entity) q = q.eq("entity", filters.entity);
  if (filters.action) q = q.eq("action", filters.action);
  if (filters.userId) q = q.eq("user_id", filters.userId);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AuditLogRow[];
}

export async function listDistinctEntities(tenantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("entity")
    .eq("tenant_id", tenantId)
    .limit(1000);
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => r.entity as string))).sort();
}
