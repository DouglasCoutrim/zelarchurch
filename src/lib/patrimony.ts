import { supabase } from "@/integrations/supabase/client";

export type AssetCondition = "novo" | "bom" | "regular" | "ruim" | "inservivel";

export const ASSET_CONDITION_OPTIONS: { value: AssetCondition; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "bom", label: "Bom" },
  { value: "regular", label: "Regular" },
  { value: "ruim", label: "Ruim" },
  { value: "inservivel", label: "Inservível" },
];

export interface Patrimony {
  id: string;
  tenant_id: string;
  name: string;
  category: string | null;
  serial_number: string | null;
  acquisition_date: string | null;
  acquisition_value: number | null;
  current_value: number | null;
  condition: string | null;
  location: string | null;
  supplier: string | null;
  warranty_until: string | null;
  photo_url: string | null;
  documents: unknown;
  created_at: string;
  deleted_at: string | null;
}

export type PatrimonyInput = Partial<Omit<Patrimony, "id" | "tenant_id" | "created_at" | "deleted_at">> & {
  name: string;
};

export interface PatrimonyFilters {
  search?: string;
  category?: string | null;
  condition?: string | null;
  location?: string | null;
}

export async function listPatrimonies(
  tenantId: string,
  filters: PatrimonyFilters = {},
): Promise<Patrimony[]> {
  let query = supabase
    .from("patrimonies")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.location) query = query.eq("location", filters.location);
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    query = query.or(
      `name.ilike.%${s}%,serial_number.ilike.%${s}%,category.ilike.%${s}%,location.ilike.%${s}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Patrimony[];
}

export async function getPatrimony(id: string): Promise<Patrimony | null> {
  const { data, error } = await supabase
    .from("patrimonies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Patrimony | null;
}

export async function createPatrimony(
  tenantId: string,
  input: PatrimonyInput,
): Promise<Patrimony> {
  const { data, error } = await supabase
    .from("patrimonies")
    .insert({ tenant_id: tenantId, ...input })
    .select("*").single();
  if (error) throw error;
  return data as Patrimony;
}

export async function updatePatrimony(
  id: string,
  input: Partial<PatrimonyInput>,
): Promise<Patrimony> {
  const { data, error } = await supabase
    .from("patrimonies").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Patrimony;
}

export async function deletePatrimony(id: string): Promise<void> {
  const { error } = await supabase
    .from("patrimonies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export interface PatrimonySummary {
  total: number;
  totalValue: number;
  byCondition: Record<string, number>;
  byCategory: { category: string; count: number; value: number }[];
}

export function summarize(list: Patrimony[]): PatrimonySummary {
  const byCondition: Record<string, number> = {};
  const byCategoryMap = new Map<string, { count: number; value: number }>();
  let totalValue = 0;
  for (const p of list) {
    const cond = p.condition ?? "—";
    byCondition[cond] = (byCondition[cond] ?? 0) + 1;
    const value = Number(p.current_value ?? p.acquisition_value ?? 0);
    totalValue += value;
    const cat = p.category ?? "Sem categoria";
    const entry = byCategoryMap.get(cat) ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += value;
    byCategoryMap.set(cat, entry);
  }
  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, v]) => ({ category, count: v.count, value: v.value }))
    .sort((a, b) => b.value - a.value);
  return { total: list.length, totalValue, byCondition, byCategory };
}
