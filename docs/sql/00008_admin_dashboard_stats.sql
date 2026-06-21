-- ============================================================================
-- Zelar — 00008_admin_dashboard_stats.sql
-- RPC única que retorna TODAS as métricas do dashboard de super admin em JSON.
-- Uso no front: supabase.rpc('get_admin_dashboard_stats')
-- Protegida: só super admins recebem dados; demais usuários => erro 403.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now              timestamptz := now();
  v_month_start      timestamptz := date_trunc('month', v_now);
  v_total_tenants    int;
  v_active_month     int;
  v_in_trial         int;
  v_mrr              numeric;
  v_new_per_month    jsonb;
  v_plan_distrib     jsonb;
  v_revenue_6m       jsonb;
  v_latest_tenants   jsonb;
  v_trials_expiring  jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- KPIs ---------------------------------------------------------------
  SELECT count(*) INTO v_total_tenants FROM public.tenants;

  SELECT count(*) INTO v_active_month
  FROM public.tenants
  WHERE status = 'active' AND updated_at >= v_month_start;

  SELECT count(*) INTO v_in_trial
  FROM public.tenants
  WHERE status = 'trial'
    AND (trial_ends_at IS NULL OR trial_ends_at >= v_now);

  SELECT COALESCE(SUM(
           CASE WHEN s.period = 'yearly' THEN s.amount / 12.0 ELSE s.amount END
         ), 0)
    INTO v_mrr
  FROM public.subscriptions s
  WHERE s.status = 'active';

  -- Novas igrejas por mês (últimos 12 meses) ---------------------------
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', v_now) - interval '11 months',
      date_trunc('month', v_now),
      interval '1 month'
    )::date AS m
  ),
  counts AS (
    SELECT date_trunc('month', created_at)::date AS m, count(*) AS c
    FROM public.tenants
    WHERE created_at >= date_trunc('month', v_now) - interval '11 months'
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'month', to_char(months.m, 'YYYY-MM'),
           'label', to_char(months.m, 'TMMon'),
           'count', COALESCE(counts.c, 0)
         ) ORDER BY months.m), '[]'::jsonb)
    INTO v_new_per_month
  FROM months LEFT JOIN counts ON counts.m = months.m;

  -- Distribuição por plano ---------------------------------------------
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'slug', p.slug,
           'name', p.name,
           'count', COALESCE(t.c, 0)
         ) ORDER BY p.sort_order), '[]'::jsonb)
    INTO v_plan_distrib
  FROM public.plans p
  LEFT JOIN (
    SELECT plan_id, count(*) AS c FROM public.tenants GROUP BY plan_id
  ) t ON t.plan_id = p.id
  WHERE p.is_active;

  -- Faturamento mensal (últimos 6 meses) -------------------------------
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', v_now) - interval '5 months',
      date_trunc('month', v_now),
      interval '1 month'
    )::date AS m
  ),
  rev AS (
    SELECT date_trunc('month', s.started_at)::date AS m,
           SUM(CASE WHEN s.period = 'yearly' THEN s.amount / 12.0 ELSE s.amount END) AS total
    FROM public.subscriptions s
    WHERE s.status = 'active'
      AND s.started_at >= date_trunc('month', v_now) - interval '5 months'
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'month', to_char(months.m, 'YYYY-MM'),
           'label', to_char(months.m, 'TMMon'),
           'total', COALESCE(rev.total, 0)
         ) ORDER BY months.m), '[]'::jsonb)
    INTO v_revenue_6m
  FROM months LEFT JOIN rev ON rev.m = months.m;

  -- 5 últimas igrejas cadastradas --------------------------------------
  SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC), '[]'::jsonb)
    INTO v_latest_tenants
  FROM (
    SELECT t.id, t.name, t.status::text, t.created_at,
           p.name AS plan_name, p.slug AS plan_slug
    FROM public.tenants t
    LEFT JOIN public.plans p ON p.id = t.plan_id
    ORDER BY t.created_at DESC
    LIMIT 5
  ) x;

  -- Trials expirando nos próximos 7 dias -------------------------------
  SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.trial_ends_at ASC), '[]'::jsonb)
    INTO v_trials_expiring
  FROM (
    SELECT t.id, t.name, t.trial_ends_at, t.email,
           p.name AS plan_name,
           EXTRACT(DAY FROM (t.trial_ends_at - v_now))::int AS days_left
    FROM public.tenants t
    LEFT JOIN public.plans p ON p.id = t.plan_id
    WHERE t.status = 'trial'
      AND t.trial_ends_at IS NOT NULL
      AND t.trial_ends_at >= v_now
      AND t.trial_ends_at <= v_now + interval '7 days'
    ORDER BY t.trial_ends_at ASC
    LIMIT 20
  ) x;

  RETURN jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_tenants',  v_total_tenants,
      'active_month',   v_active_month,
      'in_trial',       v_in_trial,
      'mrr',            v_mrr
    ),
    'new_tenants_per_month', v_new_per_month,
    'plan_distribution',     v_plan_distrib,
    'revenue_last_6_months', v_revenue_6m,
    'latest_tenants',        v_latest_tenants,
    'trials_expiring_7d',    v_trials_expiring,
    'generated_at',          v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;


-- Ações rápidas para trials expirando -------------------------------------
-- Estender o trial em N dias
CREATE OR REPLACE FUNCTION public.admin_extend_trial(_tenant_id uuid, _days int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _days IS NULL OR _days <= 0 OR _days > 365 THEN
    RAISE EXCEPTION 'invalid days';
  END IF;

  UPDATE public.tenants
     SET trial_ends_at = COALESCE(trial_ends_at, now()) + make_interval(days => _days),
         status = 'trial',
         updated_at = now()
   WHERE id = _tenant_id;

  INSERT INTO public.admin_access_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'extend_trial', 'tenant', _tenant_id,
          jsonb_build_object('days', _days));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_extend_trial(uuid, int) TO authenticated;

-- Converter trial em assinatura ativa
CREATE OR REPLACE FUNCTION public.admin_convert_trial(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.tenants
     SET status = 'active',
         trial_ends_at = NULL,
         updated_at = now()
   WHERE id = _tenant_id;

  INSERT INTO public.admin_access_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'convert_trial', 'tenant', _tenant_id, '{}'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_convert_trial(uuid) TO authenticated;
