import { supabase } from "@/integrations/supabase/client";

export type AccountType = "receita" | "despesa";
export type TransactionType = "receita" | "despesa";
export type TransactionStatus = "pendente" | "pago" | "recebido" | "cancelado";

export const TRANSACTION_STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "recebido", label: "Recebido" },
  { value: "cancelado", label: "Cancelado" },
];

export interface ChartAccount {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CostCenter {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  description: string;
  notes: string | null;
  account_id: string | null;
  cost_center_id: string | null;
  member_id: string | null;
  payment_method: string | null;
  transaction_date: string;
  due_date: string | null;
  paid_at: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface TransactionRow extends Transaction {
  account?: { id: string; name: string; code: string } | null;
  cost_center?: { id: string; name: string } | null;
}

// -------- Plano de contas --------
export async function listAccounts(tenantId: string): Promise<ChartAccount[]> {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("type", { ascending: true })
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChartAccount[];
}

export async function createAccount(
  tenantId: string,
  input: { code: string; name: string; type: AccountType; parent_id?: string | null },
): Promise<ChartAccount> {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .insert({ tenant_id: tenantId, is_active: true, ...input })
    .select("*")
    .single();
  if (error) throw error;
  return data as ChartAccount;
}

export async function updateAccount(
  id: string,
  input: Partial<Pick<ChartAccount, "code" | "name" | "type" | "parent_id" | "is_active">>,
): Promise<ChartAccount> {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChartAccount;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id);
  if (error) throw error;
}

// -------- Centros de custo --------
export async function listCostCenters(tenantId: string): Promise<CostCenter[]> {
  const { data, error } = await supabase
    .from("cost_centers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CostCenter[];
}

// -------- Lançamentos --------
export interface ListTransactionsParams {
  tenantId: string;
  type?: TransactionType | "all";
  status?: TransactionStatus | "all";
  from?: string; // YYYY-MM-DD
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listTransactions(
  params: ListTransactionsParams,
): Promise<{ rows: TransactionRow[]; total: number }> {
  const { tenantId, type, status, from, to, search } = params;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  let q = supabase
    .from("transactions")
    .select(
      "*, account:chart_of_accounts(id, name, code), cost_center:cost_centers(id, name)",
      { count: "exact" },
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false });

  if (type && type !== "all") q = q.eq("type", type);
  if (status && status !== "all") q = q.eq("status", status);
  if (from) q = q.gte("transaction_date", from);
  if (to) q = q.lte("transaction_date", to);
  if (search && search.trim()) q = q.ilike("description", `%${search.trim()}%`);

  const start = (page - 1) * pageSize;
  q = q.range(start, start + pageSize - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as TransactionRow[], total: count ?? 0 };
}

export interface TransactionInput {
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  description: string;
  notes?: string | null;
  account_id?: string | null;
  cost_center_id?: string | null;
  member_id?: string | null;
  payment_method?: string | null;
  transaction_date: string;
  due_date?: string | null;
  paid_at?: string | null;
}

export async function createTransaction(
  tenantId: string,
  input: TransactionInput,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({ tenant_id: tenantId, ...input })
    .select("*")
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function softDeleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getFinanceSummary(
  tenantId: string,
  from?: string,
  to?: string,
): Promise<{ receitas: number; despesas: number; saldo: number; pendente: number }> {
  let q = supabase
    .from("transactions")
    .select("type, status, amount")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  if (from) q = q.gte("transaction_date", from);
  if (to) q = q.lte("transaction_date", to);
  const { data, error } = await q;
  if (error) throw error;
  let receitas = 0,
    despesas = 0,
    pendente = 0;
  for (const r of (data ?? []) as { type: string; status: string; amount: number }[]) {
    const v = Number(r.amount) || 0;
    if (r.status === "cancelado") continue;
    if (r.status === "pendente") pendente += v;
    else if (r.type === "receita") receitas += v;
    else if (r.type === "despesa") despesas += v;
  }
  return { receitas, despesas, saldo: receitas - despesas, pendente };
}
