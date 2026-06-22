-- 00016_geo_checkin.sql
-- Check-in por geolocalização (raio configurável, padrão 200m).
--
-- Adiciona coordenadas em tenants e checkins, e cria a RPC
-- geo_checkin(p_schedule_id, p_lat, p_lng) que:
--   - identifica o membro logado pelo auth.uid()
--   - valida que o tenant tem coordenadas configuradas
--   - calcula distância (Haversine) até a igreja
--   - rejeita se distância > raio (default 200m)
--   - registra o check-in com method='geo' + lat/lng/distância

-- 1. TENANTS: coordenadas e raio --------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS latitude              DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS checkin_radius_meters INTEGER NOT NULL DEFAULT 200;

-- 2. CHECKINS: coordenadas + distância --------------------------------
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS latitude         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS distance_meters  DOUBLE PRECISION;

-- Permite method = 'geo' (caso haja CHECK constraint, ignore o erro)
DO $$
BEGIN
  ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_method_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. RPC: geo_checkin -------------------------------------------------
CREATE OR REPLACE FUNCTION public.geo_checkin(
  p_schedule_id UUID,
  p_lat         DOUBLE PRECISION,
  p_lng         DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_tenant_id UUID;
  v_member_id UUID;
  v_lat       DOUBLE PRECISION;
  v_lng       DOUBLE PRECISION;
  v_radius    INTEGER;
  v_distance  DOUBLE PRECISION;
  v_checkin   public.checkins;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_lat IS NULL OR p_lng IS NULL THEN
    RAISE EXCEPTION 'Localização inválida' USING ERRCODE = '22023';
  END IF;

  -- tenant da escala
  SELECT s.tenant_id INTO v_tenant_id
  FROM public.schedules s
  WHERE s.id = p_schedule_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Escala não encontrada' USING ERRCODE = 'P0002';
  END IF;

  -- membro vinculado ao usuário neste tenant
  SELECT m.id INTO v_member_id
  FROM public.members m
  WHERE m.tenant_id = v_tenant_id
    AND m.user_id = v_user_id
    AND m.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Você não é um membro desta igreja' USING ERRCODE = '42501';
  END IF;

  -- coordenadas da igreja
  SELECT t.latitude, t.longitude, COALESCE(t.checkin_radius_meters, 200)
    INTO v_lat, v_lng, v_radius
  FROM public.tenants t
  WHERE t.id = v_tenant_id;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    RAISE EXCEPTION 'A igreja ainda não configurou sua localização' USING ERRCODE = '22023';
  END IF;

  -- Haversine (em metros)
  v_distance := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_lat - v_lat) / 2), 2)
    + cos(radians(v_lat)) * cos(radians(p_lat))
      * power(sin(radians(p_lng - v_lng) / 2), 2)
  ));

  IF v_distance > v_radius THEN
    RAISE EXCEPTION 'Você está a % metros da igreja (limite: % m)',
      round(v_distance)::int, v_radius
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.checkins (
    tenant_id, schedule_id, member_id, method,
    latitude, longitude, distance_meters, checked_in_at
  )
  VALUES (
    v_tenant_id, p_schedule_id, v_member_id, 'geo',
    p_lat, p_lng, v_distance, now()
  )
  ON CONFLICT (schedule_id, member_id) DO UPDATE
    SET method          = 'geo',
        latitude        = EXCLUDED.latitude,
        longitude       = EXCLUDED.longitude,
        distance_meters = EXCLUDED.distance_meters,
        checked_in_at   = now()
  RETURNING * INTO v_checkin;

  RETURN jsonb_build_object(
    'checkin_id',      v_checkin.id,
    'member_id',       v_member_id,
    'distance_meters', round(v_distance)::int,
    'radius_meters',   v_radius,
    'checked_in_at',   v_checkin.checked_in_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.geo_checkin(UUID, DOUBLE PRECISION, DOUBLE PRECISION)
  TO authenticated;
