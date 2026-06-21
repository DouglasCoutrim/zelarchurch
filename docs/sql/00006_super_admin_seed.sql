-- ============================================================================
-- Zelar — 00006_super_admin_seed.sql
-- INSTRUÇÕES:
-- 1) Crie um usuário pelo painel: Auth → Users → Add user (com seu email).
-- 2) Copie o UUID do usuário criado.
-- 3) Substitua 'COLE_O_UUID_AQUI' abaixo e rode esta migration.
-- ============================================================================

DO $$
DECLARE
  v_super_admin_id UUID := 'COLE_O_UUID_AQUI'::uuid;
BEGIN
  IF v_super_admin_id IS NULL OR v_super_admin_id::text = '00000000-0000-0000-0000-000000000000' THEN
    RAISE NOTICE 'Pule esta migration até ter o UUID do usuário super admin.';
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, full_name, is_super_admin)
  VALUES (v_super_admin_id, 'Super Admin', true)
  ON CONFLICT (id) DO UPDATE SET is_super_admin = true;
END $$;

-- Super admins enxergam TODOS os tenants (sobrepõe a default)
DROP POLICY IF EXISTS tenants_super_admin_all ON public.tenants;
CREATE POLICY tenants_super_admin_all ON public.tenants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin));
