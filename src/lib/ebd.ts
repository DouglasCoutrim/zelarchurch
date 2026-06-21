import { supabase } from "@/integrations/supabase/client";

export interface EbdClass {
  id: string;
  tenant_id: string;
  name: string;
  age_range: string | null;
  teacher_id: string | null;
  room: string | null;
  is_active: boolean;
}

export interface EbdClassWithRefs extends EbdClass {
  teacher?: { id: string; full_name: string } | null;
  student_count?: number;
}

export interface EbdAttendance {
  id: string;
  tenant_id: string;
  class_id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  is_present: boolean;
}

export type EbdClassInput = {
  name: string;
  age_range?: string | null;
  teacher_id?: string | null;
  room?: string | null;
  is_active?: boolean;
};

export async function listClasses(tenantId: string): Promise<EbdClassWithRefs[]> {
  const { data, error } = await supabase
    .from("ebd_classes")
    .select(`*, teacher:members!ebd_classes_teacher_id_fkey(id, full_name)`)
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as EbdClassWithRefs[];
}

export async function getClass(id: string): Promise<EbdClassWithRefs | null> {
  const { data, error } = await supabase
    .from("ebd_classes")
    .select(`*, teacher:members!ebd_classes_teacher_id_fkey(id, full_name)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as EbdClassWithRefs | null;
}

export async function createClass(tenantId: string, input: EbdClassInput): Promise<EbdClass> {
  const { data, error } = await supabase
    .from("ebd_classes")
    .insert({ tenant_id: tenantId, is_active: true, ...input })
    .select("*").single();
  if (error) throw error;
  return data as EbdClass;
}

export async function updateClass(id: string, input: Partial<EbdClassInput>): Promise<EbdClass> {
  const { data, error } = await supabase
    .from("ebd_classes").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as EbdClass;
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from("ebd_classes").delete().eq("id", id);
  if (error) throw error;
}

// -------- Students (class roster) --------
// Class roster is derived from attendance history. There is no separate roster table,
// so "students" of a class are the union of members who already have an attendance record
// for that class plus any member added via attendance for a given date.

export interface ClassStudent {
  member_id: string;
  full_name: string;
  photo_url: string | null;
  last_present_at: string | null;
  total_present: number;
}

export async function listClassStudents(
  tenantId: string,
  classId: string,
): Promise<ClassStudent[]> {
  const { data, error } = await supabase
    .from("ebd_attendance")
    .select(`
      student_id, date, is_present,
      student:members!ebd_attendance_student_id_fkey(id, full_name, photo_url)
    `)
    .eq("tenant_id", tenantId)
    .eq("class_id", classId);
  if (error) throw error;

  type Row = {
    student_id: string; date: string; is_present: boolean;
    student: { id: string; full_name: string; photo_url: string | null } | { id: string; full_name: string; photo_url: string | null }[] | null;
  };
  const map = new Map<string, ClassStudent>();
  for (const r of (data ?? []) as unknown as Row[]) {
    const s = Array.isArray(r.student) ? r.student[0] : r.student;
    if (!s) continue;
    const cur = map.get(s.id) ?? {
      member_id: s.id, full_name: s.full_name, photo_url: s.photo_url,
      last_present_at: null, total_present: 0,
    };
    if (r.is_present) {
      cur.total_present += 1;
      if (!cur.last_present_at || r.date > cur.last_present_at) cur.last_present_at = r.date;
    }
    map.set(s.id, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
}

// -------- Attendance --------
export async function getAttendanceForDate(
  tenantId: string,
  classId: string,
  date: string,
): Promise<EbdAttendance[]> {
  const { data, error } = await supabase
    .from("ebd_attendance")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("class_id", classId)
    .eq("date", date);
  if (error) throw error;
  return (data ?? []) as EbdAttendance[];
}

export async function setAttendance(input: {
  tenantId: string;
  classId: string;
  studentId: string;
  date: string;
  isPresent: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("ebd_attendance")
    .upsert(
      {
        tenant_id: input.tenantId,
        class_id: input.classId,
        student_id: input.studentId,
        date: input.date,
        is_present: input.isPresent,
      },
      { onConflict: "class_id,student_id,date" },
    );
  if (error) throw error;
}

export async function removeAttendance(
  classId: string,
  studentId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase
    .from("ebd_attendance")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .eq("date", date);
  if (error) throw error;
}

// -------- Stats --------
export interface ClassStats {
  class_id: string;
  total_records: number;
  unique_students: number;
  presence_rate: number; // 0..1
  last_date: string | null;
}

export async function getClassStats(
  tenantId: string,
  classId: string,
): Promise<ClassStats> {
  const { data, error } = await supabase
    .from("ebd_attendance")
    .select("student_id, date, is_present")
    .eq("tenant_id", tenantId)
    .eq("class_id", classId);
  if (error) throw error;
  const rows = (data ?? []) as { student_id: string; date: string; is_present: boolean }[];
  const total = rows.length;
  const present = rows.filter((r) => r.is_present).length;
  const unique = new Set(rows.map((r) => r.student_id)).size;
  const last = rows.reduce<string | null>((acc, r) => (!acc || r.date > acc ? r.date : acc), null);
  return {
    class_id: classId,
    total_records: total,
    unique_students: unique,
    presence_rate: total > 0 ? present / total : 0,
    last_date: last,
  };
}
