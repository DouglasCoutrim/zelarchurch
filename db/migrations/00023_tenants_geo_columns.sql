-- 00023_tenants_geo_columns.sql
-- Garante que a tabela tenants tenha as colunas de geolocalização usadas
-- pelas Configurações e pelo check-in por GPS. Idempotente.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS latitude              DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS checkin_radius_meters INTEGER DEFAULT 500;

-- Recarrega o cache do PostgREST para que a Data API enxergue as colunas novas
NOTIFY pgrst, 'reload schema';
