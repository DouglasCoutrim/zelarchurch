import { supabase } from "@/integrations/supabase/client";
import type { MemberStatus } from "@/types/member";

export interface MemberAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface MemberRecord {
  id: string;
  tenant_id: string;
  registration_number: string | null;
  full_name: string;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  gender: string | null;
  marital_status: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: MemberAddress | null;
  photo_url: string | null;
  baptism_date: string | null;
  join_date: string | null;
  member_type: string | null;
  church_role: string | null;
  spiritual_gifts: string[] | null;
  status: MemberStatus;
  notes: string | null;
  is_intercessor: boolean;
  congregation_id: string | null;
  created_at: string;
}

export type MemberFormInput = Omit<MemberRecord, "id" | "tenant_id" | "created_at" | "registration_number">;

export async function getMember(id: string): Promise<MemberRecord> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Membro não encontrado");
  return data as MemberRecord;
}

export async function createMember(
  tenantId: string,
  input: MemberFormInput,
): Promise<MemberRecord> {
  const { data, error } = await supabase
    .from("members")
    .insert({ ...input, tenant_id: tenantId })
    .select("*")
    .single();
  if (error) throw error;
  return data as MemberRecord;
}

export async function updateMember(
  id: string,
  input: Partial<MemberFormInput>,
): Promise<MemberRecord> {
  const { data, error } = await supabase
    .from("members")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MemberRecord;
}

/** Soft-delete: marca `deleted_at` para esconder de listagens. */
export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase
    .from("members")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
