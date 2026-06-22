import { supabase } from "@/integrations/supabase/client";

export interface CheckinRow {
  id: string;
  tenant_id: string;
  schedule_id: string;
  member_id: string;
  method: string;
  location: unknown | null;
  checked_in_at: string;
}

export interface CheckinParticipant {
  member_id: string;
  full_name: string;
  photo_url: string | null;
  role_in_schedule: string | null;
  scheduled: boolean;
  checkin: CheckinRow | null;
}

export async function listUpcomingSchedules(
  tenantId: string,
  hoursWindow = 48,
) {
  const from = new Date(Date.now() - 6 * 60 * 60_000).toISOString();
  const to = new Date(Date.now() + hoursWindow * 60 * 60_000).toISOString();
  const { data, error } = await supabase
    .from("schedules")
    .select(
      "id, title, event_type, location, starts_at, ends_at, department:departments(id, name), schedule_members(member_id), checkins(id)",
    )
    .eq("tenant_id", tenantId)
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  type Raw = {
    id: string; title: string; event_type: string | null;
    location: string | null; starts_at: string; ends_at: string;
    department: { id: string; name: string } | { id: string; name: string }[] | null;
    schedule_members: unknown[];
    checkins: unknown[];
  };
  return ((data ?? []) as Raw[]).map((s) => ({
    ...s,
    department: Array.isArray(s.department) ? s.department[0] ?? null : s.department,
    scheduled_count: s.schedule_members?.length ?? 0,
    checkin_count: s.checkins?.length ?? 0,
  }));
}

export async function getScheduleForCheckin(scheduleId: string) {
  const { data, error } = await supabase
    .from("schedules")
    .select("id, title, event_type, location, starts_at, ends_at, department:departments(id, name)")
    .eq("id", scheduleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const d = data as {
    id: string; title: string; event_type: string | null;
    location: string | null; starts_at: string; ends_at: string;
    department: { id: string; name: string } | { id: string; name: string }[] | null;
  };
  return {
    ...d,
    department: Array.isArray(d.department) ? d.department[0] ?? null : d.department,
  };
}

export async function listParticipantsForCheckin(
  tenantId: string,
  scheduleId: string,
): Promise<CheckinParticipant[]> {
  // scheduled members
  const sm = await supabase
    .from("schedule_members")
    .select("member_id, role_in_schedule, member:members(id, full_name, photo_url)")
    .eq("schedule_id", scheduleId);
  if (sm.error) throw sm.error;
  // existing check-ins
  const ck = await supabase
    .from("checkins")
    .select("*")
    .eq("schedule_id", scheduleId);
  if (ck.error) throw ck.error;
  const checkinByMember = new Map<string, CheckinRow>();
  for (const c of (ck.data ?? []) as CheckinRow[]) {
    checkinByMember.set(c.member_id, c);
  }
  type SmRow = {
    member_id: string;
    role_in_schedule: string | null;
    member:
      | { id: string; full_name: string; photo_url: string | null }
      | { id: string; full_name: string; photo_url: string | null }[]
      | null;
  };
  const map = new Map<string, CheckinParticipant>();
  for (const r of (sm.data ?? []) as SmRow[]) {
    const m = Array.isArray(r.member) ? r.member[0] : r.member;
    if (!m) continue;
    map.set(m.id, {
      member_id: m.id,
      full_name: m.full_name,
      photo_url: m.photo_url,
      role_in_schedule: r.role_in_schedule,
      scheduled: true,
      checkin: checkinByMember.get(m.id) ?? null,
    });
  }
  // include guests (checked in but not scheduled)
  const missing = (ck.data ?? []).filter((c) => !map.has(c.member_id));
  if (missing.length > 0) {
    const ids = missing.map((c) => c.member_id);
    const mm = await supabase
      .from("members")
      .select("id, full_name, photo_url")
      .eq("tenant_id", tenantId)
      .in("id", ids);
    for (const m of (mm.data ?? []) as { id: string; full_name: string; photo_url: string | null }[]) {
      map.set(m.id, {
        member_id: m.id,
        full_name: m.full_name,
        photo_url: m.photo_url,
        role_in_schedule: null,
        scheduled: false,
        checkin: checkinByMember.get(m.id) ?? null,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.full_name.localeCompare(b.full_name, "pt-BR"),
  );
}

export async function searchMembersForCheckin(
  tenantId: string,
  term: string,
) {
  let q = supabase
    .from("members")
    .select("id, full_name, photo_url")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("full_name").limit(20);
  if (term.trim()) q = q.ilike("full_name", `%${term.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as { id: string; full_name: string; photo_url: string | null }[];
}

export async function checkInMember(input: {
  tenantId: string;
  scheduleId: string;
  memberId: string;
  method?: "manual" | "qr" | "self";
}): Promise<CheckinRow> {
  const { tenantId, scheduleId, memberId, method = "manual" } = input;
  const { data, error } = await supabase
    .from("checkins")
    .upsert(
      {
        tenant_id: tenantId,
        schedule_id: scheduleId,
        member_id: memberId,
        method,
        checked_in_at: new Date().toISOString(),
      },
      { onConflict: "schedule_id,member_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as CheckinRow;
}

export interface GeoCheckinResult {
  checkin_id: string;
  member_id: string;
  distance_meters: number;
  radius_meters: number;
  checked_in_at: string;
}

export async function geoCheckIn(
  scheduleId: string,
  lat: number,
  lng: number,
): Promise<GeoCheckinResult> {
  const { data, error } = await supabase.rpc("geo_checkin", {
    p_schedule_id: scheduleId,
    p_lat: lat,
    p_lng: lng,
  });
  if (error) throw error;
  return data as GeoCheckinResult;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Seu dispositivo não suporta geolocalização."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      const msgs: Record<number, string> = {
        1: "Permissão de localização negada. Habilite no navegador para fazer check-in.",
        2: "Não foi possível obter sua localização. Verifique o GPS.",
        3: "Tempo esgotado ao obter localização. Tente novamente.",
      };
      reject(new Error(msgs[err.code] ?? err.message));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}

export async function undoCheckIn(
  scheduleId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("checkins")
    .delete()
    .eq("schedule_id", scheduleId)
    .eq("member_id", memberId);
  if (error) throw error;
}
