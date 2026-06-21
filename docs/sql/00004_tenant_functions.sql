-- ============================================================================
-- Zelar — 00004_tenant_functions.sql
-- Funções de contexto multi-tenant, permissões e RPCs públicas.
-- RODAR ANTES de 00002 (as policies dependem destas funções).
-- ============================================================================

-- set_tenant: define o tenant ativo na sessão (chamar UMA vez por login/troca)
CREATE OR REPLACE FUNCTION public.set_tenant(tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_users.tenant_id = set_tenant.tenant_id
      AND user_id = auth.uid()
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'forbidden: user not in tenant %', tenant_id USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$;

-- get_current_tenant_id: usa o setting da sessão; fallback para tenant único
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v TEXT;
  v_uuid UUID;
BEGIN
  v := current_setting('app.current_tenant_id', true);
  IF v IS NULL OR v = '' THEN
    SELECT tenant_id INTO v_uuid
    FROM public.tenant_users
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 2;
    RETURN v_uuid;
  END IF;
  RETURN v::uuid;
END;
$$;

-- is_tenant_admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND is_active = true
      AND (is_admin = true OR is_owner = true)
  );
$$;

-- has_permission: cargo no tenant atual ou admin
CREATE OR REPLACE FUNCTION public.has_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    JOIN public.tenant_user_roles tur ON tur.tenant_user_id = tu.id
    JOIN public.roles r ON r.id = tur.role_id
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = public.get_current_tenant_id()
      AND tu.is_active = true
      AND r.permissions ? p_permission
  )
  OR public.is_tenant_admin(public.get_current_tenant_id());
$$;

-- get_tenant_usage: uma única query para o hook usePlanLimit
CREATE OR REPLACE FUNCTION public.get_tenant_usage(p_tenant_id UUID)
RETURNS TABLE (
  max_members INT,
  current_members INT,
  max_departments INT,
  current_departments INT,
  features JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.max_members,
    (SELECT COUNT(*)::INT FROM public.members m WHERE m.tenant_id = t.id AND m.deleted_at IS NULL),
    p.max_departments,
    (SELECT COUNT(*)::INT FROM public.departments d WHERE d.tenant_id = t.id AND d.is_active),
    COALESCE(
      (SELECT jsonb_object_agg(pf.feature_key, pf.is_enabled)
       FROM public.plan_features pf WHERE pf.plan_id = t.plan_id),
      '{}'::jsonb
    )
  FROM public.tenants t
  JOIN public.plans p ON p.id = t.plan_id
  WHERE t.id = p_tenant_id;
$$;

-- create_tenant_with_setup: cria igreja + owner + cargos + plano de contas + assinatura, tudo atômico
CREATE OR REPLACE FUNCTION public.create_tenant_with_setup(
  p_church_name TEXT,
  p_cnpj TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_city TEXT,
  p_state TEXT,
  p_plan_slug TEXT,
  p_pastor_name TEXT
) RETURNS public.tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants;
  v_plan_id UUID;
  v_base_slug TEXT;
  v_slug TEXT;
  v_user_id UUID := auth.uid();
  v_attempts INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;

  SELECT id INTO v_plan_id FROM public.plans WHERE slug = p_plan_slug AND is_active = true;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'plan not found: %', p_plan_slug;
  END IF;

  v_base_slug := regexp_replace(lower(p_church_name), '[^a-z0-9]+', '-', 'g');
  v_base_slug := trim(both '-' from v_base_slug);
  IF v_base_slug = '' THEN v_base_slug := 'igreja'; END IF;

  LOOP
    v_slug := v_base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    BEGIN
      INSERT INTO public.tenants (name, slug, cnpj, email, phone, city, state, plan_id, status, trial_ends_at)
      VALUES (p_church_name, v_slug, p_cnpj, p_email, p_phone, p_city, p_state, v_plan_id, 'trial', NOW() + INTERVAL '14 days')
      RETURNING * INTO v_tenant;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN RAISE; END IF;
    END;
  END LOOP;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (v_user_id, p_pastor_name, p_phone)
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  INSERT INTO public.tenant_users (tenant_id, user_id, is_owner, is_admin, invitation_accepted_at)
  VALUES (v_tenant.id, v_user_id, true, true, NOW());

  INSERT INTO public.roles (tenant_id, name, permissions, is_system) VALUES
    (v_tenant.id, 'Pastor',                 '["members:manage","financial:read","schedules:manage","minutes:manage","reports:read"]'::jsonb, true),
    (v_tenant.id, 'Tesoureiro',             '["financial:write","patrimony:write","reports:read"]'::jsonb, true),
    (v_tenant.id, 'Conselheiro Fiscal',     '["fiscal:read","reports:read"]'::jsonb, true),
    (v_tenant.id, 'Líder de Departamento',  '["members:read","schedules:manage","checkin:manage"]'::jsonb, true),
    (v_tenant.id, 'Secretário',             '["members:read","minutes:manage","schedules:read"]'::jsonb, true),
    (v_tenant.id, 'Membro',                 '["schedules:view","checkin:self"]'::jsonb, true);

  INSERT INTO public.chart_of_accounts (tenant_id, code, name, type) VALUES
    (v_tenant.id, '1',   'Receitas',             'receita'),
    (v_tenant.id, '1.1', 'Dízimos',              'receita'),
    (v_tenant.id, '1.2', 'Ofertas',              'receita'),
    (v_tenant.id, '1.3', 'Campanhas',            'receita'),
    (v_tenant.id, '2',   'Despesas',             'despesa'),
    (v_tenant.id, '2.1', 'Manutenção',           'despesa'),
    (v_tenant.id, '2.2', 'Água/Luz/Internet',    'despesa'),
    (v_tenant.id, '2.3', 'Missões',              'despesa'),
    (v_tenant.id, '2.4', 'Folha Pastoral',       'despesa');

  INSERT INTO public.subscriptions (tenant_id, plan_id, period, status, started_at, ends_at, amount)
  VALUES (v_tenant.id, v_plan_id, 'monthly', 'active', NOW(), NOW() + INTERVAL '14 days', 0);

  RETURN v_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant(UUID)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_usage(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_setup(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
