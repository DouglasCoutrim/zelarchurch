-- =====================================================================
-- Zelar — 00014 — RPC público para obter dados mínimos de um convite
-- Permite à página /invite/:token mostrar o nome da igreja sem expor
-- toda a tabela tenants para anon.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token UUID)
RETURNS TABLE (
  tenant_id   UUID,
  tenant_name TEXT,
  tenant_logo TEXT,
  tenant_city TEXT,
  tenant_uf   TEXT,
  status      TEXT,
  expires_at  TIMESTAMPTZ,
  max_uses    INT,
  current_uses INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.tenant_id,
    t.name,
    t.logo_url,
    t.city,
    t.state,
    i.status,
    i.expires_at,
    i.max_uses,
    i.current_uses
  FROM public.invitations i
  JOIN public.tenants t ON t.id = i.tenant_id
  WHERE i.token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(UUID) TO anon, authenticated;
