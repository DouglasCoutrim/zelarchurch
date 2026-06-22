-- ============================================================================
-- Zelar — 00021_congregations.sql
-- Adiciona suporte a congregações (filiais) por tenant.
-- ============================================================================

-- 1. Tabela congregations
CREATE TABLE IF NOT EXISTS public.congregations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  address         TEXT,
  city            VARCHAR(100),
  state           VARCHAR(2),
  phone           VARCHAR(20),
  responsible_id  UUID REFERENCES public.members(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregations TO authenticated;
GRANT ALL ON public.congregations TO service_role;

CREATE INDEX IF NOT EXISTS idx_congregations_tenant_id     ON public.congregations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_congregations_responsible   ON public.congregations(responsible_id);

-- updated_at trigger (reaproveita função set_updated_at se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_congregations_updated_at ON public.congregations';
    EXECUTE 'CREATE TRIGGER trg_congregations_updated_at BEFORE UPDATE ON public.congregations
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END$$;

-- 2. members.congregation_id
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS congregation_id UUID REFERENCES public.congregations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_members_congregation_id ON public.members(congregation_id);

-- 3. transactions.congregation_id
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS congregation_id UUID REFERENCES public.congregations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_congregation_id ON public.transactions(congregation_id);

-- 4. plans.max_congregations
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_congregations INTEGER DEFAULT 0;

-- 5. RLS em congregations
ALTER TABLE public.congregations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS congregations_select ON public.congregations;
DROP POLICY IF EXISTS congregations_write  ON public.congregations;

CREATE POLICY congregations_select ON public.congregations
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY congregations_write ON public.congregations
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.is_tenant_admin(tenant_id)
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.is_tenant_admin(tenant_id)
  );

-- 6. As políticas existentes em members e transactions já filtram por
--    tenant_id = get_current_tenant_id(); a nova coluna congregation_id é
--    apenas informacional e não afeta o isolamento por tenant. Nada a alterar.
