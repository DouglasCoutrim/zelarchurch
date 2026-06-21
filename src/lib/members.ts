import { supabase } from "@/integrations/supabase/client";
import type { MemberListRow, MemberStatus } from "@/types/member";

export interface ListMembersParams {
  tenantId: string;
  search?: string;
  status?: MemberStatus | "all";
  page: number;
  pageSize: number;
}

export interface ListMembersResult {
  rows: MemberListRow[];
  total: number;
}

export async function listMembers(p: ListMembersParams): Promise<ListMembersResult> {
  const from = (p.page - 1) * p.pageSize;
  const to = from + p.pageSize - 1;

  let q = supabase
    .from("members")
    .select("id, full_name, email, phone, status, member_type, photo_url, created_at", {
      count: "exact",
    })
    .eq("tenant_id", p.tenantId)
    .is("deleted_at", null)
    .order("full_name", { ascending: true })
    .range(from, to);

  if (p.status && p.status !== "all") q = q.eq("status", p.status);
  if (p.search && p.search.trim()) {
    const term = `%${p.search.trim()}%`;
    q = q.or(`full_name.ilike.${term},email.ilike.${term},cpf.ilike.${term}`);
  }

  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as MemberListRow[], total: count ?? 0 };
}
