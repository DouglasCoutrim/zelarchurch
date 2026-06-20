export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  created_at: string;
}

export interface TenantUser {
  tenant_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
}
