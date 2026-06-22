import { supabase } from "@/integrations/supabase/client";

export type Proficiency = "principal" | "regular" | "substituto";

export interface Instrument {
  id: string;
  tenant_id: string;
  department_id: string;
  name: string;
  required: boolean;
  created_at: string;
}

export interface MemberInstrument {
  id: string;
  member_id: string;
  instrument_id: string;
  proficiency: Proficiency;
  is_active: boolean;
}

export async function listInstruments(departmentId: string): Promise<Instrument[]> {
  const { data, error } = await supabase
    .from("department_instruments")
    .select("*")
    .eq("department_id", departmentId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Instrument[];
}

export async function createInstrument(
  tenantId: string,
  departmentId: string,
  name: string,
  required = true,
): Promise<Instrument> {
  const { data, error } = await supabase
    .from("department_instruments")
    .insert({ tenant_id: tenantId, department_id: departmentId, name, required })
    .select("*").single();
  if (error) throw error;
  return data as Instrument;
}

export async function updateInstrument(
  id: string,
  input: Partial<Pick<Instrument, "name" | "required">>,
): Promise<void> {
  const { error } = await supabase.from("department_instruments").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteInstrument(id: string): Promise<void> {
  const { error } = await supabase.from("department_instruments").delete().eq("id", id);
  if (error) throw error;
}

export async function listMemberInstruments(
  departmentId: string,
): Promise<(MemberInstrument & { member_name: string; instrument_name: string })[]> {
  const { data, error } = await supabase
    .from("member_instruments")
    .select(
      "id, member_id, instrument_id, proficiency, is_active, member:members(full_name), instrument:department_instruments!inner(name, department_id)",
    )
    .eq("instrument.department_id", departmentId);
  if (error) throw error;
  type Raw = MemberInstrument & {
    member: { full_name: string } | { full_name: string }[] | null;
    instrument: { name: string } | { name: string }[] | null;
  };
  return ((data ?? []) as Raw[]).map((r) => {
    const m = Array.isArray(r.member) ? r.member[0] : r.member;
    const i = Array.isArray(r.instrument) ? r.instrument[0] : r.instrument;
    return {
      ...r,
      member_name: m?.full_name ?? "",
      instrument_name: i?.name ?? "",
    };
  });
}

export async function setMemberInstrument(
  tenantId: string,
  memberId: string,
  instrumentId: string,
  proficiency: Proficiency = "regular",
): Promise<void> {
  const { error } = await supabase.from("member_instruments").upsert(
    { tenant_id: tenantId, member_id: memberId, instrument_id: instrumentId, proficiency, is_active: true },
    { onConflict: "member_id,instrument_id" },
  );
  if (error) throw error;
}

export async function removeMemberInstrument(memberId: string, instrumentId: string): Promise<void> {
  const { error } = await supabase
    .from("member_instruments")
    .delete()
    .eq("member_id", memberId)
    .eq("instrument_id", instrumentId);
  if (error) throw error;
}
