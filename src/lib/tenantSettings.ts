import { supabase } from "@/integrations/supabase/client";

export interface TenantSettingsData {
  timezone?: string;
  language?: string;
  currency?: string;
}

export interface TenantFull {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string | null;
  settings: TenantSettingsData;
  created_at: string;
  updated_at: string;
}

export interface TenantUpdateInput {
  name?: string;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  settings?: TenantSettingsData;
}

export async function getTenant(tenantId: string): Promise<TenantFull> {
  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id,name,slug,cnpj,email,phone,city,state,website,logo_url,primary_color,settings,created_at,updated_at",
    )
    .eq("id", tenantId)
    .single();
  if (error) throw error;
  return data as unknown as TenantFull;
}

export async function updateTenant(
  tenantId: string,
  input: TenantUpdateInput,
): Promise<TenantFull> {
  const { data, error } = await supabase
    .from("tenants")
    .update(input)
    .eq("id", tenantId)
    .select(
      "id,name,slug,cnpj,email,phone,city,state,website,logo_url,primary_color,settings,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  return data as unknown as TenantFull;
}

export interface TeamMember {
  id: string;
  user_id: string;
  is_owner: boolean;
  is_admin: boolean;
  is_active: boolean;
  invitation_accepted_at: string | null;
  created_at: string;
}

export async function listTeam(tenantId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("tenant_users")
    .select("id,user_id,is_owner,is_admin,is_active,invitation_accepted_at,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export async function setMemberAdmin(memberId: string, isAdmin: boolean): Promise<void> {
  const { error } = await supabase
    .from("tenant_users")
    .update({ is_admin: isAdmin })
    .eq("id", memberId);
  if (error) throw error;
}

export async function setMemberActive(memberId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("tenant_users")
    .update({ is_active: isActive })
    .eq("id", memberId);
  if (error) throw error;
}
