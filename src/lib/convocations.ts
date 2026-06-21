import { supabase } from "@/integrations/supabase/client";

export interface Convocation {
  id: string;
  tenant_id: string;
  title: string;
  body: string | null;
  meeting_at: string;
  location: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
}

export type ConvocationInput = {
  title: string;
  body?: string | null;
  meeting_at: string;
  location?: string | null;
  published_at?: string | null;
};

export async function listConvocations(tenantId: string): Promise<Convocation[]> {
  const { data, error } = await supabase
    .from("convocations")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("meeting_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Convocation[];
}

export async function createConvocation(tenantId: string, input: ConvocationInput): Promise<Convocation> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("convocations")
    .insert({ tenant_id: tenantId, created_by: userData.user?.id ?? null, ...input })
    .select("*").single();
  if (error) throw error;
  return data as Convocation;
}

export async function updateConvocation(id: string, input: Partial<ConvocationInput>): Promise<Convocation> {
  const { data, error } = await supabase
    .from("convocations").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Convocation;
}

export async function publishConvocation(id: string): Promise<Convocation> {
  return updateConvocation(id, { published_at: new Date().toISOString() });
}

export async function unpublishConvocation(id: string): Promise<Convocation> {
  return updateConvocation(id, { published_at: null });
}

export async function deleteConvocation(id: string): Promise<void> {
  const { error } = await supabase.from("convocations").delete().eq("id", id);
  if (error) throw error;
}
