import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { NEAR_LIMIT_THRESHOLD } from "@/config/constants";
import type { TenantUsage } from "@/types/plan";

type LimitType = "members" | "departments";

interface UsePlanLimitResult {
  usage: TenantUsage | null;
  loading: boolean;
  error: Error | null;
  canAddMember: boolean;
  canAddDepartment: boolean;
  hasFeature: (key: string) => boolean;
  isNearLimit: (type: LimitType, threshold?: number) => boolean;
}

export function usePlanLimit(tenantId: string | null | undefined): UsePlanLimitResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["plan-usage", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<TenantUsage> => {
      const { data, error } = await supabase.rpc("get_tenant_usage", {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        maxMembers: row?.max_members ?? 0,
        currentMembers: row?.current_members ?? 0,
        maxDepartments: row?.max_departments ?? 0,
        currentDepartments: row?.current_departments ?? 0,
        features: (row?.features ?? {}) as Record<string, boolean>,
      };
    },
  });

  const usage = data ?? null;

  return {
    usage,
    loading: isLoading,
    error: (error as Error) ?? null,
    canAddMember: usage ? usage.currentMembers < usage.maxMembers : false,
    canAddDepartment: usage ? usage.currentDepartments < usage.maxDepartments : false,
    hasFeature: (key) => !!usage?.features?.[key],
    isNearLimit: (type, threshold = NEAR_LIMIT_THRESHOLD) => {
      if (!usage) return false;
      const [current, max] =
        type === "members"
          ? [usage.currentMembers, usage.maxMembers]
          : [usage.currentDepartments, usage.maxDepartments];
      if (!max) return false;
      return current / max >= threshold;
    },
  };
}
