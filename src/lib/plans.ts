import { supabase } from "@/integrations/supabase/client";

export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_members: number;
  max_departments: number;
  sort_order: number;
}

export async function fetchActivePlans(): Promise<PlanRow[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, slug, name, description, price_monthly, price_yearly, max_members, max_departments, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanRow[];
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
