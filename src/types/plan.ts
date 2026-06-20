export interface Plan {
  id: string;
  name: string;
  max_members: number;
  max_departments: number;
  features: Record<string, boolean>;
}

export interface TenantUsage {
  maxMembers: number;
  currentMembers: number;
  maxDepartments: number;
  currentDepartments: number;
  features: Record<string, boolean>;
}
