import { supabase } from "@/integrations/supabase/client";

export type PrayerStatus = "aberto" | "em_oracao" | "respondido" | "arquivado";

export const PRAYER_STATUS_LABEL: Record<PrayerStatus, string> = {
  aberto: "Aberto",
  em_oracao: "Em oração",
  respondido: "Respondido",
  arquivado: "Arquivado",
};

export interface PrayerRequest {
  id: string;
  tenant_id: string;
  author_user_id: string | null;
  author_member_id: string | null;
  is_anonymous: boolean;
  requester_name: string | null;
  requester_contact: string | null;
  content: string;
  status: PrayerStatus;
  created_at: string;
  updated_at: string;
  author?: { full_name: string } | null;
}

export async function submitPrayerRequest(input: {
  tenantId: string;
  content: string;
  isAnonymous: boolean;
  requesterName?: string | null;
  requesterContact?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("submit_prayer_request", {
    p_tenant_id: input.tenantId,
    p_content: input.content,
    p_is_anonymous: input.isAnonymous,
    p_requester_name: input.requesterName ?? null,
    p_requester_contact: input.requesterContact ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function listPrayerRequests(tenantId: string): Promise<PrayerRequest[]> {
  const { data, error } = await supabase
    .from("prayer_requests")
    .select(
      "id,tenant_id,author_user_id,author_member_id,is_anonymous,requester_name,requester_contact,content,status,created_at,updated_at,author:members!prayer_requests_author_member_id_fkey(full_name)",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  type Row = Omit<PrayerRequest, "author"> & {
    author: { full_name: string } | { full_name: string }[] | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    ...r,
    author: Array.isArray(r.author) ? r.author[0] ?? null : r.author,
  }));
}

export async function updatePrayerStatus(id: string, status: PrayerStatus): Promise<void> {
  const { error } = await supabase
    .from("prayer_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
