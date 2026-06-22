import { supabase } from "@/integrations/supabase/client";

export interface Department {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentWithCount extends Department {
  member_count: number;
}

export interface DepartmentRole {
  id: string;
  tenant_id: string;
  department_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface DepartmentMember {
  id: string;
  full_name: string;
  status: string;
  photo_url: string | null;
  role_id: string | null;
  role_name: string | null;
}

export async function listDepartments(tenantId: string): Promise<DepartmentWithCount[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*, member_departments(count)")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d: Department & { member_departments: { count: number }[] }) => ({
    ...d,
    member_count: d.member_departments?.[0]?.count ?? 0,
  }));
}

export async function createDepartment(
  tenantId: string,
  input: { name: string; description?: string | null; leader_id?: string | null },
): Promise<Department> {
  const { data, error } = await supabase
    .from("departments")
    .insert({ tenant_id: tenantId, is_active: true, ...input })
    .select("*").single();
  if (error) throw error;
  return data as Department;
}

export async function updateDepartment(
  id: string,
  input: Partial<Pick<Department, "name" | "description" | "leader_id" | "is_active">>,
): Promise<Department> {
  const { data, error } = await supabase
    .from("departments").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Department;
}

export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw error;
}

export async function getDepartmentMembers(departmentId: string): Promise<DepartmentMember[]> {
  const { data, error } = await supabase
    .from("member_departments")
    .select(
      "role_id, role:department_roles(id,name), member:members(id, full_name, status, photo_url)",
    )
    .eq("department_id", departmentId);
  if (error) throw error;
  type Row = {
    role_id: string | null;
    role: { id: string; name: string } | { id: string; name: string }[] | null;
    member:
      | { id: string; full_name: string; status: string; photo_url: string | null }
      | { id: string; full_name: string; status: string; photo_url: string | null }[]
      | null;
  };
  const rows = (data ?? []) as Row[];
  return rows
    .map((r) => {
      const member = Array.isArray(r.member) ? r.member[0] : r.member;
      if (!member) return null;
      const role = Array.isArray(r.role) ? r.role[0] : r.role;
      return {
        id: member.id,
        full_name: member.full_name,
        status: member.status,
        photo_url: member.photo_url,
        role_id: r.role_id,
        role_name: role?.name ?? null,
      } satisfies DepartmentMember;
    })
    .filter((x): x is DepartmentMember => x !== null);
}

export async function addMemberToDepartment(
  tenantId: string, departmentId: string, memberId: string, roleId?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("member_departments")
    .insert({
      tenant_id: tenantId,
      department_id: departmentId,
      member_id: memberId,
      role_id: roleId ?? null,
    });
  if (error) throw error;
}

export async function updateMemberDepartmentRole(
  departmentId: string, memberId: string, roleId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("member_departments")
    .update({ role_id: roleId })
    .eq("department_id", departmentId)
    .eq("member_id", memberId);
  if (error) throw error;
}

export async function removeMemberFromDepartment(
  departmentId: string, memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("member_departments")
    .delete()
    .eq("department_id", departmentId)
    .eq("member_id", memberId);
  if (error) throw error;
}

export async function searchMembersForLink(tenantId: string, term: string) {
  let q = supabase
    .from("members")
    .select("id, full_name")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("full_name").limit(20);
  if (term.trim()) q = q.ilike("full_name", `%${term.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as { id: string; full_name: string }[];
}

/* -------- Department roles -------- */

export async function listDepartmentRoles(departmentId: string): Promise<DepartmentRole[]> {
  const { data, error } = await supabase
    .from("department_roles")
    .select("*")
    .eq("department_id", departmentId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DepartmentRole[];
}

export async function createDepartmentRole(
  tenantId: string,
  departmentId: string,
  input: { name: string; description?: string | null },
): Promise<DepartmentRole> {
  const { data, error } = await supabase
    .from("department_roles")
    .insert({
      tenant_id: tenantId,
      department_id: departmentId,
      name: input.name,
      description: input.description ?? null,
    })
    .select("*").single();
  if (error) throw error;
  return data as DepartmentRole;
}

export async function updateDepartmentRole(
  id: string,
  input: { name?: string; description?: string | null },
): Promise<DepartmentRole> {
  const { data, error } = await supabase
    .from("department_roles")
    .update(input)
    .eq("id", id)
    .select("*").single();
  if (error) throw error;
  return data as DepartmentRole;
}

export async function deleteDepartmentRole(id: string): Promise<void> {
  const { error } = await supabase.from("department_roles").delete().eq("id", id);
  if (error) throw error;
}
