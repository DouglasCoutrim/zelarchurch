import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tenant } from "@/types/tenant";

interface TenantState {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  loading: boolean;
  setCurrentTenant: (tenant: Tenant | null) => void;
  setTenants: (tenants: Tenant[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      currentTenant: null,
      tenants: [],
      loading: false,
      setCurrentTenant: (currentTenant) => set({ currentTenant }),
      setTenants: (tenants) => set({ tenants }),
      setLoading: (loading) => set({ loading }),
      reset: () => set({ currentTenant: null, tenants: [], loading: false }),
    }),
    {
      name: "zelar.tenant",
      partialize: (state) => ({ currentTenant: state.currentTenant }),
    },
  ),
);
