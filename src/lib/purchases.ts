import { supabase } from "@/integrations/supabase/client";

export type PurchaseStatus = "aguardando" | "aprovado" | "rejeitado" | "comprado";
export type PurchaseUrgency = "baixa" | "normal" | "alta" | "urgente";

export const PURCHASE_STATUS_OPTIONS: { value: PurchaseStatus; label: string }[] = [
  { value: "aguardando", label: "Aguardando" },
  { value: "aprovado", label: "Aprovado" },
  { value: "rejeitado", label: "Rejeitado" },
  { value: "comprado", label: "Comprado" },
];

export const URGENCY_OPTIONS: { value: PurchaseUrgency; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export interface PurchaseRequest {
  id: string;
  tenant_id: string;
  item: string;
  justification: string;
  quantity: number;
  estimated_value: number | null;
  supplier_suggestion: string | null;
  urgency: PurchaseUrgency;
  department_id: string | null;
  needed_by: string | null;
  status: PurchaseStatus;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface PurchaseRequestRow extends PurchaseRequest {
  department?: { id: string; name: string } | null;
}

export type PurchaseInput = {
  item: string;
  justification: string;
  quantity: number;
  estimated_value?: number | null;
  supplier_suggestion?: string | null;
  urgency: PurchaseUrgency;
  department_id?: string | null;
  needed_by?: string | null;
};

export async function listPurchaseRequests(
  tenantId: string,
  status?: PurchaseStatus | "all",
): Promise<PurchaseRequestRow[]> {
  let q = supabase
    .from("purchase_requests")
    .select("*, department:departments(id, name)")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PurchaseRequestRow[];
}

export async function createPurchaseRequest(
  tenantId: string,
  userId: string,
  input: PurchaseInput,
): Promise<PurchaseRequest> {
  const { data, error } = await supabase
    .from("purchase_requests")
    .insert({
      tenant_id: tenantId,
      requested_by: userId,
      status: "aguardando",
      ...input,
    })
    .select("*").single();
  if (error) throw error;
  return data as PurchaseRequest;
}

export async function updatePurchaseRequest(
  id: string,
  input: Partial<PurchaseInput>,
): Promise<PurchaseRequest> {
  const { data, error } = await supabase
    .from("purchase_requests").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as PurchaseRequest;
}

export async function approvePurchaseRequest(
  id: string,
  userId: string,
): Promise<PurchaseRequest> {
  const { data, error } = await supabase
    .from("purchase_requests")
    .update({
      status: "aprovado",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id).select("*").single();
  if (error) throw error;
  return data as PurchaseRequest;
}

export async function rejectPurchaseRequest(
  id: string,
  userId: string,
  reason: string,
): Promise<PurchaseRequest> {
  const { data, error } = await supabase
    .from("purchase_requests")
    .update({
      status: "rejeitado",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", id).select("*").single();
  if (error) throw error;
  return data as PurchaseRequest;
}

export async function markPurchaseAsBought(id: string): Promise<PurchaseRequest> {
  const { data, error } = await supabase
    .from("purchase_requests")
    .update({ status: "comprado" })
    .eq("id", id).select("*").single();
  if (error) throw error;
  return data as PurchaseRequest;
}

export async function deletePurchaseRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("purchase_requests")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
