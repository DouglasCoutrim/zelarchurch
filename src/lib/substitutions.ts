import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";

export interface SubstitutionRequest {
  id: string;
  schedule_id: string;
  requester_member_id: string;
  substitute_member_id: string;
  instrument_id: string | null;
  status: "pending" | "accepted" | "rejected" | "escalated" | "cancelled";
  reason: string | null;
  created_at: string;
  responded_at: string | null;
}

export async function findEligibleSubstitutes(
  scheduleId: string,
  memberId: string,
): Promise<{ id: string; full_name: string }[]> {
  // pega a atribuição
  const { data: sm, error } = await supabase
    .from("schedule_members")
    .select("instrument_id, schedule:schedules!inner(id, department_id, starts_at, ends_at, tenant_id)")
    .eq("schedule_id", scheduleId)
    .eq("member_id", memberId)
    .single();
  if (error) throw error;
  const sch = Array.isArray(sm.schedule) ? sm.schedule[0] : sm.schedule;
  if (!sch?.department_id || !sm.instrument_id) return [];

  // outros membros que tocam o mesmo instrumento
  const { data: players } = await supabase
    .from("member_instruments")
    .select("member:members!inner(id, full_name, status)")
    .eq("instrument_id", sm.instrument_id)
    .eq("is_active", true);
  type R = { member: { id: string; full_name: string; status: string } | { id: string; full_name: string; status: string }[] | null };
  const candidates = ((players ?? []) as R[])
    .map((r) => (Array.isArray(r.member) ? r.member[0] : r.member))
    .filter((m): m is { id: string; full_name: string; status: string } =>
      !!m && m.status === "ativo" && m.id !== memberId);

  if (!candidates.length) return [];

  // remove os que já estão escalados nesse horário
  const dayStart = new Date(sch.starts_at).toISOString().slice(0, 10) + "T00:00:00";
  const dayEnd = new Date(sch.starts_at).toISOString().slice(0, 10) + "T23:59:59";
  const { data: busy } = await supabase
    .from("schedule_members")
    .select("member_id, schedule:schedules!inner(starts_at)")
    .gte("schedule.starts_at", dayStart)
    .lte("schedule.starts_at", dayEnd);
  const busySet = new Set(((busy ?? []) as { member_id: string }[]).map((b) => b.member_id));

  return candidates.filter((c) => !busySet.has(c.id)).map((c) => ({ id: c.id, full_name: c.full_name }));
}

export async function requestSubstitution(input: {
  tenantId: string;
  scheduleId: string;
  requesterMemberId: string;
  substituteMemberId: string;
  reason?: string;
}): Promise<void> {
  const { data: sm } = await supabase
    .from("schedule_members")
    .select("instrument_id")
    .eq("schedule_id", input.scheduleId)
    .eq("member_id", input.requesterMemberId)
    .single();

  const { error } = await supabase.from("schedule_substitutions").insert({
    tenant_id: input.tenantId,
    schedule_id: input.scheduleId,
    requester_member_id: input.requesterMemberId,
    substitute_member_id: input.substituteMemberId,
    instrument_id: sm?.instrument_id ?? null,
    reason: input.reason ?? null,
  });
  if (error) throw error;

  // notifica substituto
  const { data: sub } = await supabase.from("members").select("user_id, full_name").eq("id", input.substituteMemberId).single();
  const { data: req } = await supabase.from("members").select("full_name").eq("id", input.requesterMemberId).single();
  const { data: sch } = await supabase.from("schedules").select("title, starts_at").eq("id", input.scheduleId).single();
  if (sub?.user_id) {
    await createNotification({
      tenant_id: input.tenantId,
      user_id: sub.user_id,
      title: "Pedido de substituição",
      body: `${req?.full_name ?? "Alguém"} pediu substituição em "${sch?.title ?? ""}" (${new Date(sch?.starts_at ?? "").toLocaleString("pt-BR")})`,
      url: "/app/minhas-escalas",
    });
  }
}

export async function respondSubstitution(
  substitutionId: string,
  accept: boolean,
): Promise<void> {
  const { data: s, error } = await supabase
    .from("schedule_substitutions")
    .select("*")
    .eq("id", substitutionId)
    .single();
  if (error) throw error;

  if (accept) {
    // troca o membro no schedule_members
    const { error: e1 } = await supabase
      .from("schedule_members")
      .update({ member_id: s.substitute_member_id, confirmation: "confirmado" })
      .eq("schedule_id", s.schedule_id)
      .eq("member_id", s.requester_member_id);
    if (e1) throw e1;
  }

  await supabase
    .from("schedule_substitutions")
    .update({ status: accept ? "accepted" : "rejected", responded_at: new Date().toISOString() })
    .eq("id", substitutionId);

  // notifica solicitante
  const { data: req } = await supabase.from("members").select("user_id").eq("id", s.requester_member_id).single();
  const { data: sch } = await supabase.from("schedules").select("title").eq("id", s.schedule_id).single();
  if (req?.user_id) {
    await createNotification({
      tenant_id: s.tenant_id,
      user_id: req.user_id,
      title: accept ? "Substituição aceita" : "Substituição recusada",
      body: `Sua solicitação para "${sch?.title ?? ""}" foi ${accept ? "aceita" : "recusada"}.`,
      url: "/app/minhas-escalas",
    });
  }
}

export async function escalateToLeader(
  substitutionId: string,
): Promise<void> {
  const { data: s, error } = await supabase
    .from("schedule_substitutions")
    .update({ status: "escalated" })
    .eq("id", substitutionId)
    .select("tenant_id, schedule_id, requester_member_id")
    .single();
  if (error) throw error;

  const { data: sch } = await supabase
    .from("schedules")
    .select("title, starts_at, department:departments!inner(leader_id, name)")
    .eq("id", s.schedule_id)
    .single();
  type D = { leader_id: string | null; name: string };
  const dep = Array.isArray(sch?.department) ? sch?.department[0] : (sch?.department as D | null);
  if (!dep?.leader_id) return;
  const { data: leader } = await supabase.from("members").select("user_id").eq("id", dep.leader_id).single();
  const { data: req } = await supabase.from("members").select("full_name").eq("id", s.requester_member_id).single();
  if (leader?.user_id) {
    await createNotification({
      tenant_id: s.tenant_id,
      user_id: leader.user_id,
      title: `Substituição não resolvida (${dep.name})`,
      body: `${req?.full_name ?? "Um membro"} não encontrou substituto para "${sch?.title ?? ""}".`,
      url: "/app/escalas",
    });
  }
}

export async function listMyPendingSubstitutions(memberId: string) {
  const { data, error } = await supabase
    .from("schedule_substitutions")
    .select("*, schedule:schedules(title, starts_at), requester:members!schedule_substitutions_requester_member_id_fkey(full_name)")
    .eq("substitute_member_id", memberId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
