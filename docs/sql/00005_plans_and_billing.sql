-- ============================================================================
-- Zelar — 00005_plans_and_billing.sql
-- Seed dos 4 planos (Básico, Plus, Premium, Enterprise) + features. Idempotente.
-- ============================================================================

INSERT INTO public.plans (slug, name, description, price_monthly, price_yearly, max_members, max_departments, max_storage_mb, sort_order)
VALUES
  ('basico',     'Básico',     'Para igrejas começando a se organizar.',  49.00,   490.00,  100, 5,  1024, 1),
  ('plus',       'Plus',       'Para igrejas em crescimento.',            99.00,   990.00,  300, 15, 5120, 2),
  ('premium',    'Premium',    'Recursos completos para igrejas médias.', 199.00, 1990.00,  800, 50, 20480, 3),
  ('enterprise', 'Enterprise', 'Sob medida para grandes redes.',           0.00,    0.00, 99999, 999, 102400, 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_members = EXCLUDED.max_members,
  max_departments = EXCLUDED.max_departments,
  max_storage_mb = EXCLUDED.max_storage_mb,
  sort_order = EXCLUDED.sort_order;

WITH plan_keys AS (
  SELECT id, slug FROM public.plans
), features (slug, feature_key, enabled) AS (
  VALUES
    -- Básico
    ('basico','members:basic',true),('basico','financial:basic',true),
    ('basico','schedules:basic',true),('basico','checkin:manual',true),
    ('basico','reports:basic',true),
    -- Plus
    ('plus','members:basic',true),('plus','financial:basic',true),
    ('plus','schedules:basic',true),('plus','checkin:manual',true),
    ('plus','checkin:gps',true),('plus','reports:basic',true),
    ('plus','minutes:basic',true),('plus','patrimony',true),
    -- Premium
    ('premium','members:basic',true),('premium','financial:basic',true),
    ('premium','financial:ofx_import',true),('premium','schedules:basic',true),
    ('premium','checkin:manual',true),('premium','checkin:gps',true),
    ('premium','checkin:qrcode',true),('premium','reports:basic',true),
    ('premium','reports:advanced',true),('premium','minutes:basic',true),
    ('premium','minutes:transcription',true),('premium','minutes:gov_br_signature',true),
    ('premium','patrimony',true),('premium','custom_roles',true),
    ('premium','push_notifications',true),('premium','ebd',true),
    -- Enterprise
    ('enterprise','members:basic',true),('enterprise','financial:basic',true),
    ('enterprise','financial:ofx_import',true),('enterprise','schedules:basic',true),
    ('enterprise','checkin:manual',true),('enterprise','checkin:gps',true),
    ('enterprise','checkin:qrcode',true),('enterprise','reports:basic',true),
    ('enterprise','reports:advanced',true),('enterprise','minutes:basic',true),
    ('enterprise','minutes:transcription',true),('enterprise','minutes:gov_br_signature',true),
    ('enterprise','patrimony',true),('enterprise','custom_roles',true),
    ('enterprise','push_notifications',true),('enterprise','ebd',true),
    ('enterprise','sso',true),('enterprise','priority_support',true)
)
INSERT INTO public.plan_features (plan_id, feature_key, is_enabled)
SELECT pk.id, f.feature_key, f.enabled
FROM features f JOIN plan_keys pk ON pk.slug = f.slug
ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
