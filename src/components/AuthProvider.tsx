import { useEffect, type ReactNode } from "react";

import { supabase, initializeTenantSession } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import type { Tenant } from "@/types/tenant";

async function loadTenantsForUser(userId: string): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenant_users")
    .select("tenant:tenants(id, name, slug, plan_id, created_at)")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (error) {
    console.error("Falha ao carregar tenants:", error);
    return [];
  }
  const rows = (data ?? []) as Array<{ tenant: Tenant | Tenant[] | null }>;
  return rows
    .flatMap((row) => (Array.isArray(row.tenant) ? row.tenant : row.tenant ? [row.tenant] : []));

async function hydrateTenants(userId: string) {
  const tenantStore = useTenantStore.getState();
  tenantStore.setLoading(true);
  try {
    const tenants = await loadTenantsForUser(userId);
    tenantStore.setTenants(tenants);

    const persisted = tenantStore.currentTenant;
    const stillValid = persisted && tenants.some((t) => t.id === persisted.id);
    let active: Tenant | null = stillValid ? persisted : null;
    if (!active && tenants.length === 1) active = tenants[0];

    if (active) {
      try {
        await initializeTenantSession(active.id);
        tenantStore.setCurrentTenant(active);
      } catch (err) {
        console.error("Falha em set_tenant:", err);
        tenantStore.setCurrentTenant(null);
      }
    } else {
      tenantStore.setCurrentTenant(null);
    }
  } finally {
    tenantStore.setLoading(false);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_OUT") {
        useTenantStore.getState().reset();
        return;
      }
      if (session?.user) {
        void hydrateTenants(session.user.id);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) void hydrateTenants(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [setSession, setLoading]);

  return <>{children}</>;
}
