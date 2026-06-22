-- =====================================================================
-- Zelar — 00012 — Convites de membros, localização e busca de igrejas
-- - Cria/ajusta tabela invitations (token, member_id, max_uses, etc.)
-- - Garante tenants.city/state + índice por localização
-- - get_churches_by_location(state, city) para o app
-- - generate_member_invite(member_id, expires_hours) para gerar links
-- - Trigger para incrementar usos e expirar quando atingir o limite
-- - Tabela auxiliar brazilian_states
-- =====================================================================

-- 1. INVITATIONS -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token           UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email           TEXT,
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colunas novas (idempotente)
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS member_id    UUID REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_uses     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_uses INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_invitations_tenant   ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token    ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_member   ON public.invitations(member_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status   ON public.invitations(status);

GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT SELECT ON public.invitations TO anon; -- leitura por token (validação)
GRANT ALL    ON public.invitations TO service_role;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admin/owner do tenant pode gerenciar tudo
DROP POLICY IF EXISTS "tenant_admins_manage_invites" ON public.invitations;
CREATE POLICY "tenant_admins_manage_invites" ON public.invitations
FOR ALL TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

-- Membro vê convites que ele mesmo gerou (member_id mapeado para seu profile)
DROP POLICY IF EXISTS "member_view_own_invites" ON public.invitations;
CREATE POLICY "member_view_own_invites" ON public.invitations
FOR SELECT TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);

-- Membro pode INSERIR convite vinculado a ele mesmo (via função SECURITY DEFINER abaixo)
DROP POLICY IF EXISTS "member_create_own_invite" ON public.invitations;
CREATE POLICY "member_create_own_invite" ON public.invitations
FOR INSERT TO authenticated
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);

-- Anon pode validar um convite via token (necessário para tela de aceite antes do login)
DROP POLICY IF EXISTS "anon_validate_invite_by_token" ON public.invitations;
CREATE POLICY "anon_validate_invite_by_token" ON public.invitations
FOR SELECT TO anon
USING (status = 'pending' AND expires_at > now());

-- 2. TENANTS: city/state + índice de localização -----------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS city  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(2);

CREATE INDEX IF NOT EXISTS idx_tenants_location ON public.tenants(state, city);

-- 3. ESTADOS BRASILEIROS ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.brazilian_states (
  uf   VARCHAR(2) PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

GRANT SELECT ON public.brazilian_states TO anon, authenticated;
GRANT ALL    ON public.brazilian_states TO service_role;

ALTER TABLE public.brazilian_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "states_public_read" ON public.brazilian_states;
CREATE POLICY "states_public_read" ON public.brazilian_states
FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.brazilian_states (uf, name) VALUES
('AC','Acre'),('AL','Alagoas'),('AP','Amapá'),('AM','Amazonas'),('BA','Bahia'),
('CE','Ceará'),('DF','Distrito Federal'),('ES','Espírito Santo'),('GO','Goiás'),
('MA','Maranhão'),('MT','Mato Grosso'),('MS','Mato Grosso do Sul'),('MG','Minas Gerais'),
('PA','Pará'),('PB','Paraíba'),('PR','Paraná'),('PE','Pernambuco'),('PI','Piauí'),
('RJ','Rio de Janeiro'),('RN','Rio Grande do Norte'),('RS','Rio Grande do Sul'),
('RO','Rondônia'),('RR','Roraima'),('SC','Santa Catarina'),('SP','São Paulo'),
('SE','Sergipe'),('TO','Tocantins')
ON CONFLICT (uf) DO NOTHING;

-- 4. get_churches_by_location -----------------------------------------
CREATE OR REPLACE FUNCTION public.get_churches_by_location(
  p_state VARCHAR DEFAULT NULL,
  p_city  VARCHAR DEFAULT NULL
)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT id, name, slug, logo_url, city, state
    FROM public.tenants
    WHERE status IN ('trial', 'active')
      AND (p_state IS NULL OR state = p_state)
      AND (p_city  IS NULL OR city ILIKE '%' || p_city || '%')
    ORDER BY name
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_churches_by_location(VARCHAR, VARCHAR) TO anon, authenticated;

-- Lista de cidades distintas (para preencher select após escolher UF)
CREATE OR REPLACE FUNCTION public.get_cities_by_state(p_state VARCHAR)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(DISTINCT city ORDER BY city), '[]'::json)
  FROM public.tenants
  WHERE status IN ('trial','active')
    AND state = p_state
    AND city IS NOT NULL AND city <> '';
$$;

GRANT EXECUTE ON FUNCTION public.get_cities_by_state(VARCHAR) TO anon, authenticated;

-- 5. generate_member_invite -------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_member_invite(
  p_member_id     UUID,
  p_expires_hours INT DEFAULT 48,
  p_max_uses      INT DEFAULT 1
)
RETURNS TABLE (id UUID, token UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id   UUID := auth.uid();
  v_id        UUID;
  v_token     UUID;
  v_expires   TIMESTAMPTZ;
BEGIN
  -- O membro deve existir e pertencer ao usuário autenticado (ou usuário ser admin do tenant)
  SELECT m.tenant_id INTO v_tenant_id
  FROM public.members m
  WHERE m.id = p_member_id
    AND (m.user_id = v_user_id OR public.is_tenant_admin(m.tenant_id));

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'forbidden: member not found or not allowed' USING ERRCODE = '42501';
  END IF;

  v_expires := now() + make_interval(hours => GREATEST(p_expires_hours, 1));

  INSERT INTO public.invitations (
    tenant_id, member_id, invited_by, status, expires_at, max_uses, current_uses
  )
  VALUES (
    v_tenant_id, p_member_id, v_user_id, 'pending', v_expires,
    GREATEST(p_max_uses, 1), 0
  )
  RETURNING invitations.id, invitations.token, invitations.expires_at
  INTO v_id, v_token, v_expires;

  id := v_id; token := v_token; expires_at := v_expires;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_member_invite(UUID, INT, INT) TO authenticated;

-- 6. Trigger: incrementar uses e expirar ao atingir limite ------------
CREATE OR REPLACE FUNCTION public._invitation_enforce_uses()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.current_uses IS DISTINCT FROM OLD.current_uses
     AND NEW.current_uses >= NEW.max_uses
     AND NEW.status = 'pending'
  THEN
    NEW.status := 'expired';
    IF NEW.accepted_at IS NULL THEN
      NEW.accepted_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invitation_enforce_uses ON public.invitations;
CREATE TRIGGER trg_invitation_enforce_uses
BEFORE UPDATE ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public._invitation_enforce_uses();

-- Função RPC para "consumir" um convite atomicamente (chamada após signup)
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token UUID)
RETURNS TABLE (tenant_id UUID, member_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv     public.invitations%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv FROM public.invitations
  WHERE token = p_token FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_inv.status <> 'pending' OR v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'invite no longer valid' USING ERRCODE = '22023';
  END IF;
  IF v_inv.current_uses >= v_inv.max_uses THEN
    RAISE EXCEPTION 'invite usage limit reached' USING ERRCODE = '22023';
  END IF;

  -- Vincula o usuário ao tenant (idempotente)
  INSERT INTO public.tenant_users (tenant_id, user_id, is_active, invitation_accepted_at)
  VALUES (v_inv.tenant_id, v_user_id, true, now())
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET is_active = true,
        invitation_accepted_at = COALESCE(public.tenant_users.invitation_accepted_at, now());

  -- Se houver member vinculado e ainda sem user_id, faz a ligação
  IF v_inv.member_id IS NOT NULL THEN
    UPDATE public.members
       SET user_id = v_user_id
     WHERE id = v_inv.member_id AND user_id IS NULL;
  END IF;

  UPDATE public.invitations
     SET current_uses = current_uses + 1,
         accepted_at  = COALESCE(accepted_at, now()),
         status       = CASE
                          WHEN current_uses + 1 >= max_uses THEN 'accepted'
                          ELSE status
                        END
   WHERE id = v_inv.id;

  tenant_id := v_inv.tenant_id;
  member_id := v_inv.member_id;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;
