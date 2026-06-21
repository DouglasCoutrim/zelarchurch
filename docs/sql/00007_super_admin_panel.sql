-- =====================================================================
-- Zelar — Painel de Super Administrador (apply manualmente no SQL Editor)
-- Tabelas: super_admins, payment_gateways, saas_settings, admin_access_logs
-- Alterações em: tenants (cortesia), profiles (is_super_admin flag espelho)
-- =====================================================================

-- 1. SUPER ADMINS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text,
  email       text,
  notes       text,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL    ON public.super_admins TO service_role;

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER (evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, anon;

-- 2. Espelha is_super_admin em profiles (consulta rápida no front)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public._sync_profile_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles SET is_super_admin = true WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles SET is_super_admin = false WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_super_admin ON public.super_admins;
CREATE TRIGGER trg_sync_profile_super_admin
AFTER INSERT OR DELETE ON public.super_admins
FOR EACH ROW EXECUTE FUNCTION public._sync_profile_super_admin();

UPDATE public.profiles p
   SET is_super_admin = true
  FROM public.super_admins sa
 WHERE p.id = sa.user_id;

DROP POLICY IF EXISTS "super_admins read self or admin"  ON public.super_admins;
DROP POLICY IF EXISTS "super_admins manage by admin"     ON public.super_admins;

CREATE POLICY "super_admins read self or admin" ON public.super_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "super_admins manage by admin" ON public.super_admins
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));


-- 3. PAYMENT GATEWAYS --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT false,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT ALL ON public.payment_gateways TO service_role;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_gateways admin only" ON public.payment_gateways;
CREATE POLICY "payment_gateways admin only" ON public.payment_gateways
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.payment_gateways (name, slug, is_active, config) VALUES
  ('Stripe',       'stripe',       false, '{"publishable_key":"","secret_key":""}'::jsonb),
  ('Mercado Pago', 'mercadopago',  false, '{"access_token":"","public_key":""}'::jsonb),
  ('Manual',       'manual',       true,  '{"instructions":"Pagamento confirmado manualmente pelo administrador."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;


-- 4. SAAS SETTINGS -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saas_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description   text,
  updated_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_settings TO authenticated;
GRANT ALL ON public.saas_settings TO service_role;
ALTER TABLE public.saas_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saas_settings admin only" ON public.saas_settings;
CREATE POLICY "saas_settings admin only" ON public.saas_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.saas_settings (setting_key, setting_value, description) VALUES
  ('trial_days',         '14'::jsonb,        'Dias do teste grátis padrão'),
  ('default_plan',       '"basico"'::jsonb,  'Slug do plano padrão no cadastro'),
  ('require_cnpj',       'false'::jsonb,     'Exige CNPJ no cadastro da igreja'),
  ('max_courtesy_days',  '365'::jsonb,       'Período máximo de cortesia em dias')
ON CONFLICT (setting_key) DO NOTHING;


-- 5. TENANTS — CORTESIA ------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_courtesy     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS courtesy_until  timestamptz,
  ADD COLUMN IF NOT EXISTS courtesy_reason text;


-- 6. ADMIN ACCESS LOGS -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_access_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid NOT NULL REFERENCES public.super_admins(user_id) ON DELETE CASCADE,
  action       text NOT NULL,
  target_type  text,
  target_id    uuid,
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address   inet,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin  ON public.admin_access_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON public.admin_access_logs(target_type, target_id);

GRANT SELECT, INSERT ON public.admin_access_logs TO authenticated;
GRANT ALL ON public.admin_access_logs TO service_role;
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_access_logs read admin"   ON public.admin_access_logs;
DROP POLICY IF EXISTS "admin_access_logs insert admin" ON public.admin_access_logs;

CREATE POLICY "admin_access_logs read admin" ON public.admin_access_logs
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "admin_access_logs insert admin" ON public.admin_access_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) AND admin_id = auth.uid());


-- 7. updated_at touch --------------------------------------------------
CREATE OR REPLACE FUNCTION public._touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_payment_gateways_touch BEFORE UPDATE ON public.payment_gateways
    FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_saas_settings_touch BEFORE UPDATE ON public.saas_settings
    FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_super_admins_touch BEFORE UPDATE ON public.super_admins
    FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- Para promover o primeiro super admin manualmente:
-- INSERT INTO public.super_admins (user_id, name, email)
-- VALUES ('<UUID-do-auth.users>', 'Seu Nome', 'voce@email.com');
-- ============================================================
