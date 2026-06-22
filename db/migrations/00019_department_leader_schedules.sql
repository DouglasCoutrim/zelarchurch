-- Permite que líderes de departamento (departments.leader_id apontando
-- para um members.id cujo user_id = auth.uid()) criem/editem escalas
-- do seu próprio departamento e gerenciem os membros dessas escalas.

CREATE OR REPLACE FUNCTION public.is_department_leader(_department_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.departments d
    JOIN public.members m ON m.id = d.leader_id
    WHERE d.id = _department_id
      AND m.user_id = auth.uid()
      AND d.is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_department_leader(UUID) TO authenticated;

-- Reescreve a política de escrita de schedules incluindo o líder
DROP POLICY IF EXISTS sch_write ON public.schedules;
CREATE POLICY sch_write ON public.schedules FOR ALL TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.has_permission('schedules:manage')
      OR public.is_tenant_admin(tenant_id)
      OR (schedules.department_id IS NOT NULL
          AND public.is_department_leader(schedules.department_id))
    )
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.has_permission('schedules:manage')
      OR public.is_tenant_admin(tenant_id)
      OR (schedules.department_id IS NOT NULL
          AND public.is_department_leader(schedules.department_id))
    )
  );

-- Reescreve a política de escrita de schedule_members
DROP POLICY IF EXISTS schm_write ON public.schedule_members;
CREATE POLICY schm_write ON public.schedule_members FOR ALL TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.has_permission('schedules:manage')
      OR public.is_tenant_admin(tenant_id)
      OR EXISTS (
        SELECT 1 FROM public.schedules s
        WHERE s.id = schedule_members.schedule_id
          AND s.department_id IS NOT NULL
          AND public.is_department_leader(s.department_id)
      )
    )
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.has_permission('schedules:manage')
      OR public.is_tenant_admin(tenant_id)
      OR EXISTS (
        SELECT 1 FROM public.schedules s
        WHERE s.id = schedule_members.schedule_id
          AND s.department_id IS NOT NULL
          AND public.is_department_leader(s.department_id)
      )
    )
  );
