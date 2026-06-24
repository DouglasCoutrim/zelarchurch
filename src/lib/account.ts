import { supabase } from "@/integrations/supabase/client";

/** Permanently deletes the currently authenticated user. */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
  await supabase.auth.signOut();
}

/** Owner-only: permanently deletes the tenant and all its data. */
export async function deleteTenant(tenantId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_tenant", { p_tenant_id: tenantId });
  if (error) throw error;
}
