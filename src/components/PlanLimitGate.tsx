import type { ReactNode } from "react";
import { AlertTriangle, Lock } from "lucide-react";

import { usePlanLimit } from "@/hooks/usePlanLimit";
import { useTenantStore } from "@/stores/tenantStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface PlanLimitGateProps {
  type: "members" | "departments";
  feature?: string;
  children: ReactNode;
}

/**
 * Gates content based on plan usage:
 * - At/over limit: blocks rendering and shows red message
 * - Near limit (>80%): renders children with a yellow warning banner
 * - Optional `feature` flag: blocks rendering if the feature isn't enabled
 */
export function PlanLimitGate({ type, feature, children }: PlanLimitGateProps) {
  const tenantId = useTenantStore((s) => s.currentTenant?.id ?? null);
  const { usage, loading, error, hasFeature, isNearLimit } = usePlanLimit(tenantId);

  if (loading) return <Skeleton className="h-24 w-full" />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load plan limits</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  if (!usage) return null;

  if (feature && !hasFeature(feature)) {
    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertTitle>Feature unavailable</AlertTitle>
        <AlertDescription>
          The “{feature}” feature is not included in your current plan.
        </AlertDescription>
      </Alert>
    );
  }

  const [current, max] =
    type === "members"
      ? [usage.currentMembers, usage.maxMembers]
      : [usage.currentDepartments, usage.maxDepartments];

  if (max > 0 && current >= max) {
    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertTitle>Plan limit reached</AlertTitle>
        <AlertDescription>
          You've reached the limit of {max} {type} for your plan. Upgrade to add more.
        </AlertDescription>
      </Alert>
    );
  }

  const near = isNearLimit(type);

  return (
    <div className="space-y-4">
      {near && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Approaching plan limit</AlertTitle>
          <AlertDescription>
            You're using {current} of {max} {type}. Consider upgrading soon.
          </AlertDescription>
        </Alert>
      )}
      {children}
    </div>
  );
}
