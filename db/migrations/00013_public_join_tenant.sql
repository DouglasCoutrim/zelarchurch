-- =====================================================================
-- Zelar — 00013 — RPC pública: usuário recém-criado entra numa igreja
-- Usado pela tela /onboarding (seleção estado/cidade/igreja).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.public_join_tenant(
  p_tenant_id UUID,
  p_full_name TEXT,
  p_phone     TEXT DEFAULT NULL
)
RETURNS TABLE (tenant_id UUID, member_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_email     TEXT;
  v_member_id UUID;
  v_exists    BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id
                 AND status IN ('trial','active'))
  INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'tenant not available' USING ERRCODE = 'P0002';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Vincula ao tenant (idempotente)
  INSERT INTO public.tenant_users (tenant_id, user_id, is_active, invitation_accepted_at)
  VALUES (p_tenant_id, v_user_id, true, now())
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET is_active = true,
        invitation_accepted_at = COALESCE(public.tenant_users.invitation_accepted_at, now());

  -- Cria registro de membro se ainda não existir
  SELECT id INTO v_member_id FROM public.members
   WHERE tenant_id = p_tenant_id AND user_id = v_user_id
   LIMIT 1;

  IF v_member_id IS NULL THEN
    INSERT INTO public.members (
      tenant_id, user_id, full_name, email, phone, status, member_type, join_date
    )
    VALUES (
      p_tenant_id, v_user_id, p_full_name, v_email, p_phone, 'ativo', 'membro', CURRENT_DATE
    )
    RETURNING id INTO v_member_id;
  END IF;

  tenant_id := p_tenant_id;
  member_id := v_member_id;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_join_tenant(UUID, TEXT, TEXT) TO authenticated;
