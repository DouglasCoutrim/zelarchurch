import { supabase } from "@/integrations/supabase/client";

export interface Congregation {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  responsible_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  responsible?: { id: string; full_name: string } | null;
}

export interface CongregationInput {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  responsible_id?: string | null;
  is_active?: boolean;
}

export async function listCongregations(tenantId: string): Promise<Congregation[]> {
  const { data, error } = await supabase
    .from("congregations")
    .select(
      "id, tenant_id, name, address, city, state, phone, responsible_id, is_active, created_at, updated_at, responsible:members!congregations_responsible_id_fkey(id, full_name)",
    )
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Congregation[];
}

export async function countCongregations(tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("congregations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return count ?? 0;
}

export async function getMaxCongregationsForTenant(
  tenantId: string,
): Promise<number | null> {
  const { data: t, error: te } = await supabase
    .from("tenants")
    .select("plan_id")
    .eq("id", tenantId)
    .maybeSingle();
  if (te) throw te;
  if (!t?.plan_id) return 0;
  const { data: p, error: pe } = await supabase
    .from("plans")
    .select("max_congregations")
    .eq("id", t.plan_id)
    .maybeSingle();
  if (pe) throw pe;
  return (p?.max_congregations ?? 0) as number | null;
}

export interface CongregationsUsage {
  current: number;
  max: number | null;
}

export async function getCongregationsUsage(tenantId: string): Promise<CongregationsUsage> {
  const [current, max] = await Promise.all([
    countCongregations(tenantId),
    getMaxCongregationsForTenant(tenantId),
  ]);
  return { current, max };
}

export function canAddCongregation(usage: CongregationsUsage | undefined): boolean {
  if (!usage) return false;
  if (usage.max === null) return true; // unlimited
  return usage.current < usage.max;
}

export async function createCongregation(
  tenantId: string,
  input: CongregationInput,
): Promise<Congregation> {
  const { data, error } = await supabase
    .from("congregations")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      phone: input.phone ?? null,
      responsible_id: input.responsible_id ?? null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Congregation;
}

export async function updateCongregation(
  id: string,
  input: CongregationInput,
): Promise<Congregation> {
  const { data, error } = await supabase
    .from("congregations")
    .update({
      name: input.name,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      phone: input.phone ?? null,
      responsible_id: input.responsible_id ?? null,
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Congregation;
}

export async function deleteCongregation(id: string): Promise<void> {
  const { error } = await supabase.from("congregations").delete().eq("id", id);
  if (error) throw error;
}

export async function deactivateCongregation(id: string): Promise<void> {
  const { error } = await supabase
    .from("congregations")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw error;
}

export async function activateCongregation(id: string): Promise<void> {
  const { error } = await supabase
    .from("congregations")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw error;
}

export interface MemberOption {
  id: string;
  full_name: string;
}

export async function listMemberOptions(tenantId: string): Promise<MemberOption[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MemberOption[];
}
