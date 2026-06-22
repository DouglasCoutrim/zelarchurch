-- 00017_prayer_requests.sql
-- Pedidos de oração + sinalização de membros intercessores.
--
-- Notificações via RPC: ao submeter, gera linhas em public.notifications para
--   - todos os usuários donos/admins do tenant (pastores)
--   - todos os membros marcados como intercessor (is_intercessor = true)
--   - todos os membros pertencentes a um departamento cujo nome
--     contenha "interces" (case-insensitive)

-- 1. MEMBERS: flag de intercessor --------------------------------------
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS is_intercessor BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_members_intercessor
  ON public.members(tenant_id) WHERE is_intercessor = true;

-- 2. PRAYER REQUESTS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_member_id    UUID REFERENCES public.members(id) ON DELETE SET NULL,
  is_anonymous        BOOLEAN NOT NULL DEFAULT false,
  requester_name      VARCHAR(120),
  requester_contact   VARCHAR(160),
  content             TEXT NOT NULL CHECK (length(btrim(content)) BETWEEN 5 AND 2000),
  status              VARCHAR(20) NOT NULL DEFAULT 'aberto'
                      CHECK (status IN ('aberto','em_oracao','respondido','arquivado')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prayer_tenant_created
  ON public.prayer_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_author
  ON public.prayer_requests(author_user_id);

GRANT SELECT, INSERT, UPDATE ON public.prayer_requests TO authenticated;
GRANT ALL ON public.prayer_requests TO service_role;

ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- Helper: o usuário atual é admin/owner do tenant?
CREATE OR REPLACE FUNCTION public.is_prayer_intercessor(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    LEFT JOIN public.member_departments md ON md.member_id = m.id
    LEFT JOIN public.departments d ON d.id = md.department_id
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id = auth.uid()
      AND m.deleted_at IS NULL
      AND (
        m.is_intercessor = true
        OR d.name ILIKE '%interces%'
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_prayer_intercessor(UUID) TO authenticated;

-- SELECT: autor vê o próprio; admin/owner do tenant vê tudo; intercessor vê tudo
DROP POLICY IF EXISTS "prayer_select_own_or_intercessor" ON public.prayer_requests;
CREATE POLICY "prayer_select_own_or_intercessor" ON public.prayer_requests
FOR SELECT TO authenticated
USING (
  author_user_id = auth.uid()
  OR public.is_tenant_admin(tenant_id)
  OR public.is_prayer_intercessor(tenant_id)
);

-- INSERT: qualquer usuário autenticado que pertença ao tenant
DROP POLICY IF EXISTS "prayer_insert_member" ON public.prayer_requests;
CREATE POLICY "prayer_insert_member" ON public.prayer_requests
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = prayer_requests.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
  )
);

-- UPDATE: admin/intercessor (para mudar status)
DROP POLICY IF EXISTS "prayer_update_intercessor" ON public.prayer_requests;
CREATE POLICY "prayer_update_intercessor" ON public.prayer_requests
FOR UPDATE TO authenticated
USING (
  public.is_tenant_admin(tenant_id)
  OR public.is_prayer_intercessor(tenant_id)
)
WITH CHECK (
  public.is_tenant_admin(tenant_id)
  OR public.is_prayer_intercessor(tenant_id)
);

-- 3. RPC: submit_prayer_request ---------------------------------------
CREATE OR REPLACE FUNCTION public.submit_prayer_request(
  p_tenant_id        UUID,
  p_content          TEXT,
  p_is_anonymous     BOOLEAN DEFAULT false,
  p_requester_name   TEXT DEFAULT NULL,
  p_requester_contact TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_member_id UUID;
  v_pr_id     UUID;
  v_title     TEXT;
  v_body      TEXT;
  v_author    TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_content IS NULL OR length(btrim(p_content)) < 5 THEN
    RAISE EXCEPTION 'Pedido muito curto' USING ERRCODE = '22023';
  END IF;
  IF length(p_content) > 2000 THEN
    RAISE EXCEPTION 'Pedido muito longo (máx. 2000 caracteres)' USING ERRCODE = '22023';
  END IF;

  -- Garante que o usuário pertence ao tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id AND user_id = v_user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Você não faz parte desta igreja' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_member_id
  FROM public.members
  WHERE tenant_id = p_tenant_id AND user_id = v_user_id AND deleted_at IS NULL
  LIMIT 1;

  INSERT INTO public.prayer_requests (
    tenant_id, author_user_id, author_member_id,
    is_anonymous, requester_name, requester_contact, content
  )
  VALUES (
    p_tenant_id, v_user_id,
    CASE WHEN COALESCE(p_is_anonymous, false) THEN NULL ELSE v_member_id END,
    COALESCE(p_is_anonymous, false),
    NULLIF(btrim(COALESCE(p_requester_name, '')), ''),
    NULLIF(btrim(COALESCE(p_requester_contact, '')), ''),
    btrim(p_content)
  )
  RETURNING id INTO v_pr_id;

  IF COALESCE(p_is_anonymous, false) THEN
    v_author := 'Anônimo';
  ELSE
    v_author := COALESCE(
      NULLIF(btrim(COALESCE(p_requester_name, '')), ''),
      (SELECT full_name FROM public.members WHERE id = v_member_id),
      'Membro'
    );
  END IF;

  v_title := 'Novo pedido de oração';
  v_body  := v_author || ': ' || left(btrim(p_content), 140)
             || CASE WHEN length(btrim(p_content)) > 140 THEN '…' ELSE '' END;

  -- Destinatários: admins/owners do tenant + intercessores
  INSERT INTO public.notifications (tenant_id, user_id, title, body, url)
  SELECT DISTINCT p_tenant_id, u.user_id, v_title, v_body, '/app/oracao'
  FROM (
    SELECT tu.user_id
    FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
      AND tu.is_active = true
      AND (tu.is_owner = true OR tu.is_admin = true)
    UNION
    SELECT m.user_id
    FROM public.members m
    LEFT JOIN public.member_departments md ON md.member_id = m.id
    LEFT JOIN public.departments d ON d.id = md.department_id
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id IS NOT NULL
      AND m.deleted_at IS NULL
      AND (m.is_intercessor = true OR d.name ILIKE '%interces%')
  ) u
  WHERE u.user_id IS NOT NULL;

  RETURN v_pr_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_prayer_request(UUID, TEXT, BOOLEAN, TEXT, TEXT)
  TO authenticated;
