-- ============================================================================
-- Zelar — 00001_initial_schema.sql
-- Cria todas as tabelas do sistema (multi-tenant via tenant_id + RLS).
-- Rodar PRIMEIRO. Não inclui policies (00002) nem funções (00003/00004).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE tenant_status AS ENUM ('trial', 'active', 'suspended', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_period AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('ativo', 'inativo', 'afastado', 'visitante', 'excluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('receita', 'despesa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pendente', 'pago', 'recebido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('receita', 'despesa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE purchase_status AS ENUM ('aguardando', 'aprovado', 'rejeitado', 'comprado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE minute_status AS ENUM ('rascunho', 'em_revisao', 'aprovada', 'assinada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- PROFILES (1:1 com auth.users) ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- PLANS ----------
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_members INT NOT NULL DEFAULT 50,
  max_departments INT NOT NULL DEFAULT 5,
  max_storage_mb INT NOT NULL DEFAULT 1024,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (plan_id, feature_key)
);

-- ---------- TENANTS ----------
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  website TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0f172a',
  plan_id UUID REFERENCES public.plans(id),
  status tenant_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  settings JSONB NOT NULL DEFAULT '{"timezone":"America/Sao_Paulo","language":"pt-BR","currency":"BRL"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON public.tenants(plan_id);

-- ---------- TENANT_USERS (sem profile_id, conforme correção do guia) ----------
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  invitation_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id, is_active);

-- ---------- ROLES (cargos eclesiásticos por tenant) ----------
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON public.roles(tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_user_roles (
  tenant_user_id UUID NOT NULL REFERENCES public.tenant_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (tenant_user_id, role_id)
);

-- ---------- DEPARTMENTS ----------
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_departments_tenant ON public.departments(tenant_id, is_active);

-- ---------- MEMBERS ----------
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  gender TEXT,
  marital_status TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address JSONB,
  photo_url TEXT,
  baptism_date DATE,
  join_date DATE,
  member_type TEXT,
  church_role TEXT,
  spiritual_gifts TEXT[],
  status member_status NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_members_tenant_active ON public.members(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_tenant_status ON public.members(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_search ON public.members USING gin (to_tsvector('portuguese', coalesce(full_name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(cpf,'')));

CREATE TABLE IF NOT EXISTS public.member_departments (
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, department_id)
);

-- ---------- FINANCEIRO ----------
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_coa_tenant ON public.chart_of_accounts(tenant_id);

CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pendente',
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  notes TEXT,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  payment_method TEXT,
  transaction_date DATE NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tx_tenant_date ON public.transactions(tenant_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tx_tenant_status ON public.transactions(tenant_id, status) WHERE deleted_at IS NULL;

-- ---------- PATRIMÔNIO ----------
CREATE TABLE IF NOT EXISTS public.patrimonies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  serial_number TEXT,
  acquisition_date DATE,
  acquisition_value NUMERIC(12,2),
  current_value NUMERIC(12,2),
  condition TEXT,
  location TEXT,
  supplier TEXT,
  warranty_until DATE,
  photo_url TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_patrimonies_tenant ON public.patrimonies(tenant_id) WHERE deleted_at IS NULL;

-- ---------- COMPRAS ----------
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  justification TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  estimated_value NUMERIC(12,2),
  supplier_suggestion TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal',
  department_id UUID REFERENCES public.departments(id),
  needed_by DATE,
  status purchase_status NOT NULL DEFAULT 'aguardando',
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pr_tenant_status ON public.purchase_requests(tenant_id, status) WHERE deleted_at IS NULL;

-- ---------- ESCALAS / EVENTOS ----------
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT,
  location TEXT,
  department_id UUID REFERENCES public.departments(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  recurrence TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedules_tenant_time ON public.schedules(tenant_id, starts_at);

CREATE TABLE IF NOT EXISTS public.schedule_members (
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_in_schedule TEXT,
  confirmation TEXT,
  PRIMARY KEY (schedule_id, member_id)
);

-- ---------- CHECK-IN ----------
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'manual',
  location JSONB,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_checkins_tenant_schedule ON public.checkins(tenant_id, schedule_id);

-- ---------- ATAS / CONVOCAÇÕES ----------
CREATE TABLE IF NOT EXISTS public.minutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  meeting_type TEXT NOT NULL,
  meeting_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  president_id UUID REFERENCES public.members(id),
  secretary_id UUID REFERENCES public.members(id),
  attendees JSONB DEFAULT '[]'::jsonb,
  agenda JSONB DEFAULT '[]'::jsonb,
  content TEXT,
  deliberations JSONB DEFAULT '[]'::jsonb,
  next_meeting_at TIMESTAMPTZ,
  status minute_status NOT NULL DEFAULT 'rascunho',
  signed_at TIMESTAMPTZ,
  signed_by UUID REFERENCES auth.users(id),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_minutes_tenant_date ON public.minutes(tenant_id, meeting_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.convocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  meeting_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_convocations_tenant ON public.convocations(tenant_id, meeting_at);

-- ---------- CONSELHO FISCAL ----------
CREATE TABLE IF NOT EXISTS public.fiscal_council_opinions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  verdict TEXT NOT NULL,
  observations TEXT NOT NULL,
  signed_by UUID NOT NULL REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- EBD ----------
CREATE TABLE IF NOT EXISTS public.ebd_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_range TEXT,
  teacher_id UUID REFERENCES public.members(id),
  room TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ebd_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.ebd_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (class_id, student_id, date)
);

-- ---------- NOTIFICAÇÕES / PUSH / AUDIT ----------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_logs(tenant_id, created_at DESC);

-- ---------- ASSINATURAS ----------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  period subscription_period NOT NULL DEFAULT 'monthly',
  status subscription_status NOT NULL DEFAULT 'active',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id, status);

-- ---------- GRANTS (Data API / PostgREST) ----------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.plans, public.plan_features TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles, public.tenants, public.tenant_users, public.roles,
  public.tenant_user_roles, public.departments, public.members,
  public.member_departments, public.chart_of_accounts, public.cost_centers,
  public.transactions, public.patrimonies, public.purchase_requests,
  public.schedules, public.schedule_members, public.checkins,
  public.minutes, public.convocations, public.fiscal_council_opinions,
  public.ebd_classes, public.ebd_attendance, public.notifications,
  public.push_subscriptions, public.audit_logs, public.subscriptions
TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
