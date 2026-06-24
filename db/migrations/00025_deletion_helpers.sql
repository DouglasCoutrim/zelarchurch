-- ============================================================================
-- Zelar — 00025_deletion_helpers.sql
-- RPCs para o usuário excluir a própria conta e (owner) excluir a igreja.
-- ============================================================================

-- 1) delete_my_account: o usuário autenticado apaga a si mesmo.
--    Remove vínculos em tenant_users, apaga profile e por fim auth.users.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;

  -- Remove vínculos com igrejas
  DELETE FROM public.tenant_users WHERE user_id = v_user_id;

  -- Remove o perfil (se existir)
  DELETE FROM public.profiles WHERE user_id = v_user_id;

  -- Por fim, apaga o usuário do auth (cascata cuida do resto)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- 2) delete_tenant: somente o owner pode apagar a igreja inteira.
CREATE OR REPLACE FUNCTION public.delete_tenant(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_owner BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id
      AND user_id = v_user_id
      AND role = 'owner'
      AND is_active = true
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'only owner can delete tenant' USING ERRCODE = '42501';
  END IF;

  -- Apaga a igreja; FKs com ON DELETE CASCADE cuidam dos dados relacionados.
  DELETE FROM public.tenants WHERE id = p_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_tenant(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_tenant(UUID) TO authenticated;
