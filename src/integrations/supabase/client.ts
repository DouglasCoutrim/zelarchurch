// Supabase client for the external project.
// The publishable (anon) key is safe to ship in client code — RLS enforces access.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gjfhsrnmflsgecixwwrh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZmhzcm5tZmxzZ2VjaXh3d3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTQ0NzEsImV4cCI6MjA5NzQ3MDQ3MX0.lq5O3fqofvExDd5hFwI2-xPtFdeuhAQKISuxSgTmF6w";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

/**
 * Initializes the tenant context for the current Postgres session via the
 * `set_tenant(tenant_id uuid)` RPC. Call after login and on tenant switch
 * before performing tenant-scoped queries.
 */
export async function initializeTenantSession(tenantId: string) {
  const { data, error } = await supabase.rpc("set_tenant", {
    tenant_id: tenantId,
  });
  if (error) throw error;
  return data;
}
