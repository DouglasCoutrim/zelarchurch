-- ============================================================================
-- Zelar — 00022_owner_member_and_settings.sql
-- 1) Garante que o pastor que registra a igreja seja inserido em public.members
-- 2) Backfill: cria registro de membro para owners existentes sem entrada
-- ============================================================================

-- 1. Atualiza create_tenant_with_setup para também inserir o pastor em members
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

  -- Insere o pastor como membro da igreja (visível na listagem de membros)
  INSERT INTO public.members (
    tenant_id, user_id, full_name, email, phone,
    member_type, church_role, status, join_date
  ) VALUES (
    v_tenant.id, v_user_id, p_pastor_name, p_email, p_phone,
    'efetivo', 'Pastor', 'ativo', CURRENT_DATE
  );

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

GRANT EXECUTE ON FUNCTION public.create_tenant_with_setup(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

-- 2. Backfill: para owners existentes sem registro em members, criar um
INSERT INTO public.members (tenant_id, user_id, full_name, email, phone, member_type, church_role, status, join_date)
SELECT
  tu.tenant_id,
  tu.user_id,
  COALESCE(p.full_name, split_part(u.email, '@', 1), 'Pastor'),
  u.email,
  p.phone,
  'efetivo',
  'Pastor',
  'ativo',
  COALESCE(tu.created_at::date, CURRENT_DATE)
FROM public.tenant_users tu
JOIN auth.users u ON u.id = tu.user_id
LEFT JOIN public.profiles p ON p.id = tu.user_id
WHERE tu.is_owner = true
  AND tu.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.tenant_id = tu.tenant_id
      AND m.user_id = tu.user_id
      AND m.deleted_at IS NULL
  );
