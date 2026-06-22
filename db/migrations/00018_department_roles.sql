-- Department roles (e.g. baterista, tecladista no ministério de louvor)
-- and per-member role within a department.

CREATE TABLE IF NOT EXISTS public.department_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, name)
);

CREATE INDEX IF NOT EXISTS idx_department_roles_department
  ON public.department_roles(department_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_roles TO authenticated;
GRANT ALL ON public.department_roles TO service_role;

ALTER TABLE public.department_roles ENABLE ROW LEVEL SECURITY;

-- Membros do tenant podem ler as funções
DROP POLICY IF EXISTS "department_roles_select" ON public.department_roles;
CREATE POLICY "department_roles_select" ON public.department_roles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = department_roles.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
  )
);

-- Apenas owner/admin podem gerenciar funções
DROP POLICY IF EXISTS "department_roles_write" ON public.department_roles;
CREATE POLICY "department_roles_write" ON public.department_roles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = department_roles.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
      AND (tu.is_owner = true OR tu.is_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = department_roles.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
      AND (tu.is_owner = true OR tu.is_admin = true)
  )
);

-- Add role_id to member_departments
ALTER TABLE public.member_departments
  ADD COLUMN IF NOT EXISTS role_id UUID
    REFERENCES public.department_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_member_departments_role
  ON public.member_departments(role_id);
