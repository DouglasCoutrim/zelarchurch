import { supabase } from "@/integrations/supabase/client";

export type MinuteStatus = "rascunho" | "em_revisao" | "aprovada" | "assinada";

export const MINUTE_STATUS_OPTIONS: { value: MinuteStatus; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "em_revisao", label: "Em revisão" },
  { value: "aprovada", label: "Aprovada" },
  { value: "assinada", label: "Assinada" },
];

export const MEETING_TYPES = [
  "Assembleia",
  "Reunião de obreiros",
  "Reunião de liderança",
  "Conselho fiscal",
  "Diretoria",
  "Outros",
];

export interface Minute {
  id: string;
  tenant_id: string;
  meeting_type: string;
  meeting_at: string;
  location: string | null;
  president_id: string | null;
  secretary_id: string | null;
  attendees: string[] | unknown;
  agenda: string[] | unknown;
  content: string | null;
  deliberations: string[] | unknown;
  next_meeting_at: string | null;
  status: MinuteStatus;
  signed_at: string | null;
  signed_by: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MinuteWithRefs extends Minute {
  president?: { id: string; full_name: string } | null;
  secretary?: { id: string; full_name: string } | null;
}

export type MinuteInput = {
  meeting_type: string;
  meeting_at: string;
  location?: string | null;
  president_id?: string | null;
  secretary_id?: string | null;
  attendees?: string[];
  agenda?: string[];
  content?: string | null;
  deliberations?: string[];
  next_meeting_at?: string | null;
  status?: MinuteStatus;
};

export async function listMinutes(tenantId: string): Promise<MinuteWithRefs[]> {
  const { data, error } = await supabase
    .from("minutes")
    .select(`
      *,
      president:members!minutes_president_id_fkey(id, full_name),
      secretary:members!minutes_secretary_id_fkey(id, full_name)
    `)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("meeting_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MinuteWithRefs[];
}

export async function getMinute(id: string): Promise<MinuteWithRefs | null> {
  const { data, error } = await supabase
    .from("minutes")
    .select(`
      *,
      president:members!minutes_president_id_fkey(id, full_name),
      secretary:members!minutes_secretary_id_fkey(id, full_name)
    `)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as MinuteWithRefs | null;
}

export async function createMinute(tenantId: string, input: MinuteInput): Promise<Minute> {
  const { data, error } = await supabase
    .from("minutes")
    .insert({ tenant_id: tenantId, ...input })
    .select("*").single();
  if (error) throw error;
  return data as Minute;
}

export async function updateMinute(id: string, input: Partial<MinuteInput>): Promise<Minute> {
  const { data, error } = await supabase
    .from("minutes")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*").single();
  if (error) throw error;
  return data as Minute;
}

export async function deleteMinute(id: string): Promise<void> {
  const { error } = await supabase
    .from("minutes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}
