-- ============================================================================
-- Zelar — 00002_rls_policies.sql
-- Ativa RLS e cria policies. DEPENDE de 00004 (rode 00004 antes desta).
-- ============================================================================

ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_user_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_departments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimonies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minutes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_council_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_classes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions           ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- PLANS / PLAN_FEATURES (públicos para landing de preços)
DROP POLICY IF EXISTS plans_read ON public.plans;
CREATE POLICY plans_read ON public.plans FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS plan_features_read ON public.plan_features;
CREATE POLICY plan_features_read ON public.plan_features FOR SELECT TO anon, authenticated USING (true);

-- TENANTS
DROP POLICY IF EXISTS tenants_member_select ON public.tenants;
DROP POLICY IF EXISTS tenants_admin_update ON public.tenants;
CREATE POLICY tenants_member_select ON public.tenants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.tenant_id = tenants.id AND tu.user_id = auth.uid() AND tu.is_active));
CREATE POLICY tenants_admin_update ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(id)) WITH CHECK (public.is_tenant_admin(id));

-- TENANT_USERS
DROP POLICY IF EXISTS tu_self_select ON public.tenant_users;
DROP POLICY IF EXISTS tu_admin_manage ON public.tenant_users;
CREATE POLICY tu_self_select ON public.tenant_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_tenant_admin(tenant_id));
CREATE POLICY tu_admin_manage ON public.tenant_users FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

-- ROLES
DROP POLICY IF EXISTS roles_tenant_select ON public.roles;
DROP POLICY IF EXISTS roles_admin_manage ON public.roles;
CREATE POLICY roles_tenant_select ON public.roles FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY roles_admin_manage ON public.roles FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.is_tenant_admin(tenant_id))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS tur_select ON public.tenant_user_roles;
DROP POLICY IF EXISTS tur_admin_manage ON public.tenant_user_roles;
CREATE POLICY tur_select ON public.tenant_user_roles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.id = tenant_user_id AND tu.tenant_id = public.get_current_tenant_id()));
CREATE POLICY tur_admin_manage ON public.tenant_user_roles FOR ALL TO authenticated
  USING (public.is_tenant_admin(public.get_current_tenant_id()))
  WITH CHECK (public.is_tenant_admin(public.get_current_tenant_id()));

-- DEPARTMENTS
DROP POLICY IF EXISTS departments_select ON public.departments;
DROP POLICY IF EXISTS departments_write  ON public.departments;
CREATE POLICY departments_select ON public.departments FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY departments_write  ON public.departments FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.is_tenant_admin(tenant_id))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.is_tenant_admin(tenant_id));

-- MEMBERS (RLS separada por operação — correção do Problema 7)
DROP POLICY IF EXISTS members_select ON public.members;
DROP POLICY IF EXISTS members_insert ON public.members;
DROP POLICY IF EXISTS members_update ON public.members;
DROP POLICY IF EXISTS members_delete ON public.members;
CREATE POLICY members_select ON public.members FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY members_insert ON public.members FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_current_tenant_id()
              AND (public.has_permission('members:manage') OR public.is_tenant_admin(tenant_id)));
CREATE POLICY members_update ON public.members FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id()
              AND (public.has_permission('members:manage') OR public.is_tenant_admin(tenant_id)));
CREATE POLICY members_delete ON public.members FOR DELETE TO authenticated
  USING (tenant_id = public.get_current_tenant_id()
         AND (public.has_permission('members:manage') OR public.is_tenant_admin(tenant_id)));

DROP POLICY IF EXISTS md_select ON public.member_departments;
DROP POLICY IF EXISTS md_write  ON public.member_departments;
CREATE POLICY md_select ON public.member_departments FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY md_write  ON public.member_departments FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND (public.has_permission('members:manage') OR public.is_tenant_admin(tenant_id)))
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- FINANCEIRO
DROP POLICY IF EXISTS coa_select ON public.chart_of_accounts;
DROP POLICY IF EXISTS coa_write  ON public.chart_of_accounts;
CREATE POLICY coa_select ON public.chart_of_accounts FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY coa_write  ON public.chart_of_accounts FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND (public.has_permission('financial:write') OR public.is_tenant_admin(tenant_id)))
  WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS cc_select ON public.cost_centers;
DROP POLICY IF EXISTS cc_write  ON public.cost_centers;
CREATE POLICY cc_select ON public.cost_centers FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY cc_write  ON public.cost_centers FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND (public.has_permission('financial:write') OR public.is_tenant_admin(tenant_id)))
  WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS tx_select ON public.transactions;
DROP POLICY IF EXISTS tx_insert ON public.transactions;
DROP POLICY IF EXISTS tx_update ON public.transactions;
DROP POLICY IF EXISTS tx_delete ON public.transactions;
CREATE POLICY tx_select ON public.transactions FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND deleted_at IS NULL
         AND (public.has_permission('financial:read') OR public.has_permission('financial:write')
              OR public.has_permission('fiscal:read') OR public.is_tenant_admin(tenant_id)));
CREATE POLICY tx_insert ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_current_tenant_id()
              AND (public.has_permission('financial:write') OR public.is_tenant_admin(tenant_id)));
CREATE POLICY tx_update ON public.transactions FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id()
              AND (public.has_permission('financial:write') OR public.is_tenant_admin(tenant_id)));
CREATE POLICY tx_delete ON public.transactions FOR DELETE TO authenticated
  USING (tenant_id = public.get_current_tenant_id()
         AND (public.has_permission('financial:write') OR public.is_tenant_admin(tenant_id)));

-- PATRIMÔNIO
DROP POLICY IF EXISTS pat_select ON public.patrimonies;
DROP POLICY IF EXISTS pat_write  ON public.patrimonies;
CREATE POLICY pat_select ON public.patrimonies FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY pat_write  ON public.patrimonies FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND (public.has_permission('patrimony:write') OR public.is_tenant_admin(tenant_id)))
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- COMPRAS
DROP POLICY IF EXISTS pr_select ON public.purchase_requests;
DROP POLICY IF EXISTS pr_write  ON public.purchase_requests;
CREATE POLICY pr_select ON public.purchase_requests FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY pr_write  ON public.purchase_requests FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND requested_by = auth.uid());

-- ESCALAS
DROP POLICY IF EXISTS sch_select ON public.schedules;
DROP POLICY IF EXISTS sch_write  ON public.schedules;
CREATE POLICY sch_select ON public.schedules FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY sch_write  ON public.schedules FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND (public.has_permission('schedules:manage') OR public.is_tenant_admin(tenant_id)))
  WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS schm_select ON public.schedule_members;
DROP POLICY IF EXISTS schm_write  ON public.schedule_members;
CREATE POLICY schm_select ON public.schedule_members FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY schm_write  ON public.schedule_members FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND (public.has_permission('schedules:manage') OR public.is_tenant_admin(tenant_id)))
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- CHECK-IN
DROP POLICY IF EXISTS ci_select ON public.checkins;
DROP POLICY IF EXISTS ci_write  ON public.checkins;
CREATE POLICY ci_select ON public.checkins FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY ci_write  ON public.checkins FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ATAS
DROP POLICY IF EXISTS min_select ON public.minutes;
DROP POLICY IF EXISTS min_write  ON public.minutes;
CREATE POLICY min_select ON public.minutes FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id() AND deleted_at IS NULL);
CREATE POLICY min_write  ON public.minutes FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND (public.has_permission('minutes:manage') OR public.is_tenant_admin(tenant_id)))
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- CONVOCAÇÕES
DROP POLICY IF EXISTS conv_select ON public.convocations;
DROP POLICY IF EXISTS conv_write  ON public.convocations;
CREATE POLICY conv_select ON public.convocations FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY conv_write  ON public.convocations FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.is_tenant_admin(tenant_id))
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- CONSELHO FISCAL
DROP POLICY IF EXISTS fco_select ON public.fiscal_council_opinions;
DROP POLICY IF EXISTS fco_write  ON public.fiscal_council_opinions;
CREATE POLICY fco_select ON public.fiscal_council_opinions FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY fco_write  ON public.fiscal_council_opinions FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.has_permission('fiscal:read'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND signed_by = auth.uid());

-- EBD
DROP POLICY IF EXISTS ebd_c_select ON public.ebd_classes;
DROP POLICY IF EXISTS ebd_c_write  ON public.ebd_classes;
CREATE POLICY ebd_c_select ON public.ebd_classes FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY ebd_c_write  ON public.ebd_classes FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.is_tenant_admin(tenant_id))
  WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS ebd_a_select ON public.ebd_attendance;
DROP POLICY IF EXISTS ebd_a_write  ON public.ebd_attendance;
CREATE POLICY ebd_a_select ON public.ebd_attendance FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY ebd_a_write  ON public.ebd_attendance FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- NOTIFICAÇÕES / PUSH
DROP POLICY IF EXISTS notif_self ON public.notifications;
CREATE POLICY notif_self ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS notif_self_update ON public.notifications;
CREATE POLICY notif_self_update ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_self ON public.push_subscriptions;
CREATE POLICY push_self ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_current_tenant_id());

-- AUDIT
DROP POLICY IF EXISTS audit_admin ON public.audit_logs;
CREATE POLICY audit_admin ON public.audit_logs FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.is_tenant_admin(tenant_id));

-- ASSINATURAS
DROP POLICY IF EXISTS subs_select ON public.subscriptions;
CREATE POLICY subs_select ON public.subscriptions FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() AND public.is_tenant_admin(tenant_id));
