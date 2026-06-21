import { supabase } from "@/integrations/supabase/client";

export type Confirmation = "pendente" | "confirmado" | "recusado";

export const CONFIRMATION_OPTIONS: { value: Confirmation; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "confirmado", label: "Confirmado" },
  { value: "recusado", label: "Recusou" },
];

export interface Schedule {
  id: string;
  tenant_id: string;
  title: string;
  event_type: string | null;
  location: string | null;
  department_id: string | null;
  starts_at: string;
  ends_at: string;
  recurrence: string | null;
  notes: string | null;
  created_at: string;
}

export interface ScheduleWithMeta extends Schedule {
  department?: { id: string; name: string } | null;
  member_count: number;
  confirmed_count: number;
}

export interface ScheduleMemberRow {
  member_id: string;
  schedule_id: string;
  role_in_schedule: string | null;
  confirmation: Confirmation | null;
  member: { id: string; full_name: string; photo_url: string | null };
}

export interface ScheduleInput {
  title: string;
  event_type?: string | null;
  location?: string | null;
  department_id?: string | null;
  starts_at: string;
  ends_at: string;
  recurrence?: string | null;
  notes?: string | null;
}

export async function listSchedules(
  tenantId: string,
  range?: { from?: string; to?: string; departmentId?: string | null },
): Promise<ScheduleWithMeta[]> {
  let q = supabase
    .from("schedules")
    .select(
      "*, department:departments(id, name), schedule_members(member_id, confirmation)",
    )
    .eq("tenant_id", tenantId)
    .order("starts_at", { ascending: true });
  if (range?.from) q = q.gte("starts_at", range.from);
  if (range?.to) q = q.lte("starts_at", range.to);
  if (range?.departmentId) q = q.eq("department_id", range.departmentId);
  const { data, error } = await q;
  if (error) throw error;
  type Raw = Schedule & {
    department: { id: string; name: string } | { id: string; name: string }[] | null;
    schedule_members: { member_id: string; confirmation: Confirmation | null }[];
  };
  return ((data ?? []) as Raw[]).map((s) => {
    const dep = Array.isArray(s.department) ? s.department[0] ?? null : s.department;
    const members = s.schedule_members ?? [];
    return {
      ...s,
      department: dep,
      member_count: members.length,
      confirmed_count: members.filter((m) => m.confirmation === "confirmado").length,
    };
  });
}

export async function getSchedule(id: string): Promise<ScheduleWithMeta | null> {
  const { data, error } = await supabase
    .from("schedules")
    .select("*, department:departments(id, name), schedule_members(member_id, confirmation)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const d = data as Schedule & {
    department: { id: string; name: string } | { id: string; name: string }[] | null;
    schedule_members: { member_id: string; confirmation: Confirmation | null }[];
  };
  const dep = Array.isArray(d.department) ? d.department[0] ?? null : d.department;
  const members = d.schedule_members ?? [];
  return {
    ...d,
    department: dep,
    member_count: members.length,
    confirmed_count: members.filter((m) => m.confirmation === "confirmado").length,
  };
}

export async function createSchedule(
  tenantId: string,
  input: ScheduleInput,
): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules")
    .insert({ tenant_id: tenantId, ...input })
    .select("*").single();
  if (error) throw error;
  return data as Schedule;
}

export async function updateSchedule(
  id: string,
  input: Partial<ScheduleInput>,
): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Schedule;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}

// ---- Membros da escala ----
export async function listScheduleMembers(
  scheduleId: string,
): Promise<ScheduleMemberRow[]> {
  const { data, error } = await supabase
    .from("schedule_members")
    .select(
      "schedule_id, member_id, role_in_schedule, confirmation, member:members(id, full_name, photo_url)",
    )
    .eq("schedule_id", scheduleId);
  if (error) throw error;
  type Raw = Omit<ScheduleMemberRow, "member"> & {
    member: ScheduleMemberRow["member"] | ScheduleMemberRow["member"][] | null;
  };
  return ((data ?? []) as Raw[])
    .map((r) => ({
      ...r,
      member: Array.isArray(r.member) ? r.member[0] : (r.member as ScheduleMemberRow["member"]),
    }))
    .filter((r) => !!r.member) as ScheduleMemberRow[];
}

export async function addMemberToSchedule(
  tenantId: string,
  scheduleId: string,
  memberId: string,
  roleInSchedule?: string | null,
): Promise<void> {
  const { error } = await supabase.from("schedule_members").insert({
    tenant_id: tenantId,
    schedule_id: scheduleId,
    member_id: memberId,
    role_in_schedule: roleInSchedule ?? null,
    confirmation: "pendente",
  });
  if (error) throw error;
}

export async function updateScheduleMember(
  scheduleId: string,
  memberId: string,
  input: { role_in_schedule?: string | null; confirmation?: Confirmation },
): Promise<void> {
  const { error } = await supabase
    .from("schedule_members")
    .update(input)
    .eq("schedule_id", scheduleId)
    .eq("member_id", memberId);
  if (error) throw error;
}

export async function removeMemberFromSchedule(
  scheduleId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("schedule_members")
    .delete()
    .eq("schedule_id", scheduleId)
    .eq("member_id", memberId);
  if (error) throw error;
}
