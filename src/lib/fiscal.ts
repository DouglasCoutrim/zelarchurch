import { supabase } from "@/integrations/supabase/client";

export type FiscalVerdict = "aprovado" | "aprovado_com_ressalvas" | "reprovado";

export const FISCAL_VERDICT_OPTIONS: { value: FiscalVerdict; label: string }[] = [
  { value: "aprovado", label: "Aprovado" },
  { value: "aprovado_com_ressalvas", label: "Aprovado com ressalvas" },
  { value: "reprovado", label: "Reprovado" },
];

export interface FiscalOpinion {
  id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  verdict: string;
  observations: string;
  signed_by: string;
  signed_at: string;
}

export type FiscalOpinionInput = {
  period_start: string;
  period_end: string;
  verdict: FiscalVerdict;
  observations: string;
};

export async function listFiscalOpinions(tenantId: string): Promise<FiscalOpinion[]> {
  const { data, error } = await supabase
    .from("fiscal_council_opinions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("period_end", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FiscalOpinion[];
}

export async function createFiscalOpinion(tenantId: string, input: FiscalOpinionInput): Promise<FiscalOpinion> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sessão expirada");
  const { data, error } = await supabase
    .from("fiscal_council_opinions")
    .insert({ tenant_id: tenantId, signed_by: userData.user.id, ...input })
    .select("*").single();
  if (error) throw error;
  return data as FiscalOpinion;
}

export async function deleteFiscalOpinion(id: string): Promise<void> {
  const { error } = await supabase.from("fiscal_council_opinions").delete().eq("id", id);
  if (error) throw error;
}
