import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";

export interface GenerationParams {
  tenantId: string;
  departmentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  daysOfWeek: number[]; // 0=Sun..6=Sat
  startTime: string; // HH:MM
  endTime: string;
  excludeMemberIds?: string[];
  title?: string;
  location?: string | null;
}

export interface DraftAssignment {
  date: string; // YYYY-MM-DD
  instrumentId: string;
  instrumentName: string;
  memberId: string | null; // null = não foi possível alocar
  memberName: string;
}

export interface DraftDate {
  date: string;
  startsAt: string; // ISO
  endsAt: string;
  assignments: DraftAssignment[];
  incomplete: boolean;
}

export interface GenerationResult {
  draft: DraftDate[];
  summary: { memberId: string; memberName: string; count: number }[];
  incompleteDates: string[];
}

function eachDateInRange(start: string, end: string, dow: number[]): string[] {
  const out: string[] = [];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    if (dow.includes(d.getDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function generateScheduleDraft(p: GenerationParams): Promise<GenerationResult> {
  const excluded = new Set(p.excludeMemberIds ?? []);

  // 1) instrumentos obrigatórios do depto
  const { data: instruments, error: e1 } = await supabase
    .from("department_instruments")
    .select("id, name, required")
    .eq("department_id", p.departmentId)
    .eq("required", true);
  if (e1) throw e1;

  // 2) membros ativos do depto
  const { data: memberRows, error: e2 } = await supabase
    .from("member_departments")
    .select("member:members!inner(id, full_name, status)")
    .eq("department_id", p.departmentId);
  if (e2) throw e2;
  type MR = { member: { id: string; full_name: string; status: string } | { id: string; full_name: string; status: string }[] | null };
  const members = ((memberRows ?? []) as MR[])
    .map((r) => (Array.isArray(r.member) ? r.member[0] : r.member))
    .filter((m): m is { id: string; full_name: string; status: string } => !!m && m.status === "ativo" && !excluded.has(m.id));

  // 3) member_instruments para esses membros
  const memberIds = members.map((m) => m.id);
  const { data: miRows, error: e3 } = await supabase
    .from("member_instruments")
    .select("member_id, instrument_id, proficiency, is_active")
    .in("member_id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("is_active", true);
  if (e3) throw e3;

  const playersByInstrument = new Map<string, string[]>();
  for (const r of (miRows ?? []) as { member_id: string; instrument_id: string }[]) {
    if (!playersByInstrument.has(r.instrument_id)) playersByInstrument.set(r.instrument_id, []);
    playersByInstrument.get(r.instrument_id)!.push(r.member_id);
  }

  const dates = eachDateInRange(p.startDate, p.endDate, p.daysOfWeek);
  const draft: DraftDate[] = [];
  const localCount = new Map<string, number>(); // contagem dentro desta geração
  const memberName = new Map(members.map((m) => [m.id, m.full_name]));

  // pré-busca: histórico de participações de cada membro
  const histCount = new Map<string, number>();
  const lastDate = new Map<string, number>(); // epoch ms; 0 se nunca
  for (const m of members) {
    const { data: c } = await supabase.rpc("get_member_participation_count", {
      _member_id: m.id, _department_id: p.departmentId, _before_date: p.startDate + "T00:00:00",
    });
    histCount.set(m.id, (c as number) ?? 0);
    const { data: l } = await supabase.rpc("get_member_last_schedule", {
      _member_id: m.id, _department_id: p.departmentId, _before_date: p.startDate + "T00:00:00",
    });
    lastDate.set(m.id, l ? new Date(l as string).getTime() : 0);
  }

  for (const date of dates) {
    const startsAt = `${date}T${p.startTime}:00`;
    const endsAt = `${date}T${p.endTime}:00`;

    // conflitos: membros já com schedule_members em outra escala no mesmo horário (status enviado/aprovado)
    const { data: conflicts } = await supabase
      .from("schedule_members")
      .select("member_id, schedule:schedules!inner(starts_at, ends_at, status)")
      .gte("schedule.starts_at", `${date}T00:00:00`)
      .lte("schedule.starts_at", `${date}T23:59:59`);
    const busy = new Set(
      ((conflicts ?? []) as { member_id: string }[]).map((c) => c.member_id),
    );

    const usedToday = new Set<string>();
    const assignments: DraftAssignment[] = [];
    let incomplete = false;

    for (const inst of (instruments ?? []) as { id: string; name: string }[]) {
      const candidates = (playersByInstrument.get(inst.id) ?? []).filter(
        (id) => !busy.has(id) && !usedToday.has(id),
      );
      candidates.sort((a, b) => {
        const ca = (histCount.get(a) ?? 0) + (localCount.get(a) ?? 0);
        const cb = (histCount.get(b) ?? 0) + (localCount.get(b) ?? 0);
        if (ca !== cb) return ca - cb;
        return (lastDate.get(a) ?? 0) - (lastDate.get(b) ?? 0);
      });
      const chosen = candidates[0] ?? null;
      if (chosen) {
        usedToday.add(chosen);
        localCount.set(chosen, (localCount.get(chosen) ?? 0) + 1);
        assignments.push({
          date, instrumentId: inst.id, instrumentName: inst.name,
          memberId: chosen, memberName: memberName.get(chosen) ?? "",
        });
      } else {
        incomplete = true;
        assignments.push({
          date, instrumentId: inst.id, instrumentName: inst.name,
          memberId: null, memberName: "—",
        });
      }
    }

    draft.push({ date, startsAt, endsAt, assignments, incomplete });
  }

  // summary
  const summary = members
    .map((m) => ({
      memberId: m.id,
      memberName: m.full_name,
      count: localCount.get(m.id) ?? 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  const incompleteDates = draft.filter((d) => d.incomplete).map((d) => d.date);

  // log
  await supabase.from("schedule_generation_logs").insert({
    tenant_id: p.tenantId,
    department_id: p.departmentId,
    params: p as unknown as Record<string, unknown>,
    result_summary: { summary, incompleteDates, total: draft.length },
  });

  return { draft, summary, incompleteDates };
}

export async function persistDraft(
  p: GenerationParams,
  draft: DraftDate[],
  title: string,
): Promise<string[]> {
  const scheduleIds: string[] = [];
  for (const day of draft) {
    const { data: sch, error } = await supabase
      .from("schedules")
      .insert({
        tenant_id: p.tenantId,
        department_id: p.departmentId,
        title,
        starts_at: new Date(day.startsAt).toISOString(),
        ends_at: new Date(day.endsAt).toISOString(),
        status: "approved",
        generation_type: "automatic",
        location: p.location ?? null,
      })
      .select("id").single();
    if (error) throw error;
    scheduleIds.push(sch.id);

    const rows = day.assignments
      .filter((a) => a.memberId)
      .map((a) => ({
        tenant_id: p.tenantId,
        schedule_id: sch.id,
        member_id: a.memberId!,
        instrument_id: a.instrumentId,
        role_in_schedule: a.instrumentName,
        confirmation: "pendente" as const,
      }));
    if (rows.length) {
      const { error: e2 } = await supabase.from("schedule_members").insert(rows);
      if (e2) throw e2;
    }
  }
  return scheduleIds;
}

export async function sendSchedule(scheduleId: string): Promise<void> {
  const { data: sch, error } = await supabase
    .from("schedules")
    .update({ status: "sent" })
    .eq("id", scheduleId)
    .select("id, tenant_id, title, starts_at, location")
    .single();
  if (error) throw error;

  const { data: members } = await supabase
    .from("schedule_members")
    .select("member:members!inner(id, user_id, full_name), role_in_schedule")
    .eq("schedule_id", scheduleId);

  type MR = {
    member: { id: string; user_id: string | null; full_name: string } | { id: string; user_id: string | null; full_name: string }[] | null;
    role_in_schedule: string | null;
  };

  const when = new Date(sch.starts_at).toLocaleString("pt-BR", {
    dateStyle: "short", timeStyle: "short",
  });

  for (const row of (members ?? []) as MR[]) {
    const m = Array.isArray(row.member) ? row.member[0] : row.member;
    if (!m?.user_id) continue;
    await createNotification({
      tenant_id: sch.tenant_id,
      user_id: m.user_id,
      title: `Você foi escalado: ${sch.title}`,
      body: `${when}${row.role_in_schedule ? ` · ${row.role_in_schedule}` : ""}${sch.location ? ` · ${sch.location}` : ""}`,
      url: `/app/minhas-escalas`,
    });
  }
}
