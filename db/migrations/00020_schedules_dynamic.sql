-- Escalas dinâmicas: instrumentos, geração automática, substituições, assiduidade.

-- Garante is_department_leader caso 00019 ainda não tenha sido aplicada.
CREATE OR REPLACE FUNCTION public.is_department_leader(_department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
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
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_department_leader(UUID) TO authenticated;


-- ===== Instrumentos por departamento =====
CREATE TABLE IF NOT EXISTS public.department_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, name)
);
CREATE INDEX IF NOT EXISTS idx_dept_instruments_dept ON public.department_instruments(department_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_instruments TO authenticated;
GRANT ALL ON public.department_instruments TO service_role;
ALTER TABLE public.department_instruments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS di_select ON public.department_instruments;
CREATE POLICY di_select ON public.department_instruments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tenant_users tu
  WHERE tu.tenant_id = department_instruments.tenant_id AND tu.user_id = auth.uid() AND tu.is_active));

DROP POLICY IF EXISTS di_write ON public.department_instruments;
CREATE POLICY di_write ON public.department_instruments FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = department_instruments.tenant_id AND tu.user_id = auth.uid() AND tu.is_active
      AND (tu.is_owner OR tu.is_admin))
  OR public.is_department_leader(department_instruments.department_id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = department_instruments.tenant_id AND tu.user_id = auth.uid() AND tu.is_active
      AND (tu.is_owner OR tu.is_admin))
  OR public.is_department_leader(department_instruments.department_id)
);

-- ===== Membros x instrumentos =====
DO $$ BEGIN
  CREATE TYPE public.proficiency_level AS ENUM ('principal','regular','substituto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.member_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES public.department_instruments(id) ON DELETE CASCADE,
  proficiency public.proficiency_level NOT NULL DEFAULT 'regular',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, instrument_id)
);
CREATE INDEX IF NOT EXISTS idx_member_instruments_member ON public.member_instruments(member_id);
CREATE INDEX IF NOT EXISTS idx_member_instruments_instrument ON public.member_instruments(instrument_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_instruments TO authenticated;
GRANT ALL ON public.member_instruments TO service_role;
ALTER TABLE public.member_instruments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mi_select ON public.member_instruments;
CREATE POLICY mi_select ON public.member_instruments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tenant_users tu
  WHERE tu.tenant_id = member_instruments.tenant_id AND tu.user_id = auth.uid() AND tu.is_active));

DROP POLICY IF EXISTS mi_write ON public.member_instruments;
CREATE POLICY mi_write ON public.member_instruments FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = member_instruments.tenant_id AND tu.user_id = auth.uid() AND tu.is_active
      AND (tu.is_owner OR tu.is_admin))
  OR EXISTS (SELECT 1 FROM public.department_instruments di
    WHERE di.id = member_instruments.instrument_id AND public.is_department_leader(di.department_id))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = member_instruments.tenant_id AND tu.user_id = auth.uid() AND tu.is_active
      AND (tu.is_owner OR tu.is_admin))
  OR EXISTS (SELECT 1 FROM public.department_instruments di
    WHERE di.id = member_instruments.instrument_id AND public.is_department_leader(di.department_id))
);

-- ===== Alterações em schedules / schedule_members =====
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sent')),
  ADD COLUMN IF NOT EXISTS generation_type TEXT NOT NULL DEFAULT 'manual' CHECK (generation_type IN ('manual','automatic'));

ALTER TABLE public.schedule_members
  ADD COLUMN IF NOT EXISTS instrument_id UUID REFERENCES public.department_instruments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attended BOOLEAN;

-- ===== Log de geração =====
CREATE TABLE IF NOT EXISTS public.schedule_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  params JSONB NOT NULL,
  result_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sgl_dept ON public.schedule_generation_logs(department_id, created_at DESC);

GRANT SELECT, INSERT ON public.schedule_generation_logs TO authenticated;
GRANT ALL ON public.schedule_generation_logs TO service_role;
ALTER TABLE public.schedule_generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sgl_select ON public.schedule_generation_logs;
CREATE POLICY sgl_select ON public.schedule_generation_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tenant_users tu
  WHERE tu.tenant_id = schedule_generation_logs.tenant_id AND tu.user_id = auth.uid() AND tu.is_active));

DROP POLICY IF EXISTS sgl_insert ON public.schedule_generation_logs;
CREATE POLICY sgl_insert ON public.schedule_generation_logs FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_users tu
  WHERE tu.tenant_id = schedule_generation_logs.tenant_id AND tu.user_id = auth.uid() AND tu.is_active));

-- ===== Substituições =====
CREATE TABLE IF NOT EXISTS public.schedule_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  requester_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  substitute_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES public.department_instruments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','escalated','cancelled')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_subs_substitute ON public.schedule_substitutions(substitute_member_id, status);
CREATE INDEX IF NOT EXISTS idx_subs_schedule ON public.schedule_substitutions(schedule_id);

GRANT SELECT, INSERT, UPDATE ON public.schedule_substitutions TO authenticated;
GRANT ALL ON public.schedule_substitutions TO service_role;
ALTER TABLE public.schedule_substitutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subs_select ON public.schedule_substitutions;
CREATE POLICY subs_select ON public.schedule_substitutions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tenant_users tu
  WHERE tu.tenant_id = schedule_substitutions.tenant_id AND tu.user_id = auth.uid() AND tu.is_active));

DROP POLICY IF EXISTS subs_insert ON public.schedule_substitutions;
CREATE POLICY subs_insert ON public.schedule_substitutions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = schedule_substitutions.tenant_id AND tu.user_id = auth.uid() AND tu.is_active)
  AND EXISTS (SELECT 1 FROM public.members m
    WHERE m.id = schedule_substitutions.requester_member_id AND m.user_id = auth.uid())
);

DROP POLICY IF EXISTS subs_update ON public.schedule_substitutions;
CREATE POLICY subs_update ON public.schedule_substitutions FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.members m
    WHERE m.user_id = auth.uid()
      AND (m.id = schedule_substitutions.substitute_member_id
        OR m.id = schedule_substitutions.requester_member_id))
  OR EXISTS (SELECT 1 FROM public.schedules s
    WHERE s.id = schedule_substitutions.schedule_id
      AND s.department_id IS NOT NULL
      AND public.is_department_leader(s.department_id))
);

-- ===== Função de contagem de participações =====
CREATE OR REPLACE FUNCTION public.get_member_participation_count(
  _member_id UUID, _department_id UUID, _before_date TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int
  FROM public.schedule_members sm
  JOIN public.schedules s ON s.id = sm.schedule_id
  WHERE sm.member_id = _member_id
    AND s.department_id = _department_id
    AND s.status = 'sent'
    AND s.starts_at < _before_date;
$$;
GRANT EXECUTE ON FUNCTION public.get_member_participation_count(UUID,UUID,TIMESTAMPTZ) TO authenticated;

-- Última escala do membro (para desempate)
CREATE OR REPLACE FUNCTION public.get_member_last_schedule(
  _member_id UUID, _department_id UUID, _before_date TIMESTAMPTZ
) RETURNS TIMESTAMPTZ
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT MAX(s.starts_at)
  FROM public.schedule_members sm
  JOIN public.schedules s ON s.id = sm.schedule_id
  WHERE sm.member_id = _member_id
    AND s.department_id = _department_id
    AND s.starts_at < _before_date;
$$;
GRANT EXECUTE ON FUNCTION public.get_member_last_schedule(UUID,UUID,TIMESTAMPTZ) TO authenticated;
