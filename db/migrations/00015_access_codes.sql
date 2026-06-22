-- =====================================================================
-- Zelar — 00015 — Códigos de acesso (QR Code) da igreja
-- - access_codes: códigos que o admin gera (com ou sem aprovação)
-- - membership_requests: solicitações pendentes quando requires_approval=true
-- - RPCs: get_access_code_by_code, redeem_access_code,
--         approve_membership_request, reject_membership_request
-- =====================================================================

-- 1. ACCESS_CODES ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_codes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code               TEXT NOT NULL UNIQUE,
  label              TEXT,
  requires_approval  BOOLEAN NOT NULL DEFAULT false,
  max_uses           INT,
  current_uses       INT NOT NULL DEFAULT 0,
  expires_at         TIMESTAMPTZ,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_codes_tenant ON public.access_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_code   ON public.access_codes(code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS access_codes_admin_all ON public.access_codes;
CREATE POLICY access_codes_admin_all ON public.access_codes
FOR ALL TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

-- 2. MEMBERSHIP_REQUESTS ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_code_id  UUID REFERENCES public.access_codes(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mreq_tenant_status ON public.membership_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mreq_user          ON public.membership_requests(user_id);

GRANT SELECT, INSERT, UPDATE ON public.membership_requests TO authenticated;
GRANT ALL ON public.membership_requests TO service_role;

ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mreq_admin_manage ON public.membership_requests;
CREATE POLICY mreq_admin_manage ON public.membership_requests
FOR ALL TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS mreq_own_select ON public.membership_requests;
CREATE POLICY mreq_own_select ON public.membership_requests
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. RPC: get_access_code_by_code (anon — para preview no /join) -------
CREATE OR REPLACE FUNCTION public.get_access_code_by_code(p_code TEXT)
RETURNS TABLE (
  tenant_id          UUID,
  tenant_name        TEXT,
  tenant_logo        TEXT,
  tenant_city        TEXT,
  tenant_uf          TEXT,
  requires_approval  BOOLEAN,
  is_active          BOOLEAN,
  expires_at         TIMESTAMPTZ,
  max_uses           INT,
  current_uses       INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ac.tenant_id, t.name, t.logo_url, t.city, t.state,
    ac.requires_approval, ac.is_active, ac.expires_at,
    ac.max_uses, ac.current_uses
  FROM public.access_codes ac
  JOIN public.tenants t ON t.id = ac.tenant_id
  WHERE upper(ac.code) = upper(p_code)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_access_code_by_code(TEXT) TO anon, authenticated;

-- 4. RPC: redeem_access_code (autenticado) ----------------------------
CREATE OR REPLACE FUNCTION public.redeem_access_code(
  p_code      TEXT,
  p_full_name TEXT,
  p_phone     TEXT DEFAULT NULL
)
RETURNS TABLE (
  tenant_id   UUID,
  status      TEXT,        -- 'approved' ou 'pending'
  member_id   UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_ac      public.access_codes%ROWTYPE;
  v_email   TEXT;
  v_member  UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_ac FROM public.access_codes
   WHERE upper(code) = upper(p_code) FOR UPDATE;

  IF NOT FOUND OR NOT v_ac.is_active THEN
    RAISE EXCEPTION 'code not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_ac.expires_at IS NOT NULL AND v_ac.expires_at <= now() THEN
    RAISE EXCEPTION 'code expired' USING ERRCODE = '22023';
  END IF;
  IF v_ac.max_uses IS NOT NULL AND v_ac.current_uses >= v_ac.max_uses THEN
    RAISE EXCEPTION 'code usage limit reached' USING ERRCODE = '22023';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  IF v_ac.requires_approval THEN
    -- Cria/atualiza solicitação pendente; NÃO vincula ainda
    INSERT INTO public.membership_requests (
      tenant_id, user_id, access_code_id, full_name, email, phone, status
    ) VALUES (
      v_ac.tenant_id, v_user_id, v_ac.id, p_full_name, v_email, p_phone, 'pending'
    )
    ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET access_code_id = EXCLUDED.access_code_id,
          full_name      = EXCLUDED.full_name,
          email          = EXCLUDED.email,
          phone          = EXCLUDED.phone,
          status         = 'pending',
          reviewed_by    = NULL,
          reviewed_at    = NULL;

    UPDATE public.access_codes
       SET current_uses = current_uses + 1, updated_at = now()
     WHERE id = v_ac.id;

    tenant_id := v_ac.tenant_id;
    status    := 'pending';
    member_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Aprovação automática: vincula ao tenant e cria membro
  INSERT INTO public.tenant_users (tenant_id, user_id, is_active, invitation_accepted_at)
  VALUES (v_ac.tenant_id, v_user_id, true, now())
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET is_active = true,
        invitation_accepted_at = COALESCE(public.tenant_users.invitation_accepted_at, now());

  SELECT id INTO v_member FROM public.members
   WHERE tenant_id = v_ac.tenant_id AND user_id = v_user_id LIMIT 1;
  IF v_member IS NULL THEN
    INSERT INTO public.members (
      tenant_id, user_id, full_name, email, phone, status, member_type, join_date
    ) VALUES (
      v_ac.tenant_id, v_user_id, p_full_name, v_email, p_phone, 'ativo', 'membro', CURRENT_DATE
    ) RETURNING id INTO v_member;
  END IF;

  INSERT INTO public.membership_requests (
    tenant_id, user_id, access_code_id, full_name, email, phone, status,
    reviewed_by, reviewed_at
  ) VALUES (
    v_ac.tenant_id, v_user_id, v_ac.id, p_full_name, v_email, p_phone, 'approved',
    v_user_id, now()
  )
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET status = 'approved', reviewed_at = now();

  UPDATE public.access_codes
     SET current_uses = current_uses + 1, updated_at = now()
   WHERE id = v_ac.id;

  tenant_id := v_ac.tenant_id;
  status    := 'approved';
  member_id := v_member;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_access_code(TEXT, TEXT, TEXT) TO authenticated;

-- 5. RPCs: approve / reject membership_request -----------------------
CREATE OR REPLACE FUNCTION public.approve_membership_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.membership_requests%ROWTYPE;
  v_member UUID;
BEGIN
  SELECT * INTO v_req FROM public.membership_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT public.is_tenant_admin(v_req.tenant_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_req.status <> 'pending' THEN RETURN; END IF;

  INSERT INTO public.tenant_users (tenant_id, user_id, is_active, invitation_accepted_at)
  VALUES (v_req.tenant_id, v_req.user_id, true, now())
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET is_active = true,
        invitation_accepted_at = COALESCE(public.tenant_users.invitation_accepted_at, now());

  SELECT id INTO v_member FROM public.members
   WHERE tenant_id = v_req.tenant_id AND user_id = v_req.user_id LIMIT 1;
  IF v_member IS NULL THEN
    INSERT INTO public.members (
      tenant_id, user_id, full_name, email, phone, status, member_type, join_date
    ) VALUES (
      v_req.tenant_id, v_req.user_id, v_req.full_name, v_req.email, v_req.phone,
      'ativo', 'membro', CURRENT_DATE
    );
  END IF;

  UPDATE public.membership_requests
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_membership_request(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_membership_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.membership_requests WHERE id = p_request_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT public.is_tenant_admin(v_tenant) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.membership_requests
     SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_membership_request(UUID) TO authenticated;

-- 6. RPC: create_access_code (admin) ---------------------------------
CREATE OR REPLACE FUNCTION public.create_access_code(
  p_label             TEXT DEFAULT NULL,
  p_requires_approval BOOLEAN DEFAULT false,
  p_max_uses          INT DEFAULT NULL,
  p_expires_at        TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (id UUID, code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID := public.get_current_tenant_id();
  v_code   TEXT;
  v_try    INT := 0;
  v_id     UUID;
BEGIN
  IF v_tenant IS NULL OR NOT public.is_tenant_admin(v_tenant) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  LOOP
    v_try := v_try + 1;
    v_code := 'ZLR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    BEGIN
      INSERT INTO public.access_codes (
        tenant_id, code, label, requires_approval, max_uses, expires_at, created_by
      ) VALUES (
        v_tenant, v_code, p_label, COALESCE(p_requires_approval, false),
        p_max_uses, p_expires_at, auth.uid()
      ) RETURNING access_codes.id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_try > 6 THEN RAISE; END IF;
    END;
  END LOOP;

  id := v_id; code := v_code;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_access_code(TEXT, BOOLEAN, INT, TIMESTAMPTZ) TO authenticated;
