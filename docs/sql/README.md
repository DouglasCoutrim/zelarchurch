# Migrations Zelar — Supabase externo

Rodar **em ordem** no painel do seu Supabase:
**SQL Editor → New query → cole o arquivo → Run.**

> ⚠️ Ordem proposital (1 → 3 → 4 → 2 → 5 → 6): as policies em `00002` chamam funções criadas em `00004`.

| Passo | Arquivo | O que faz |
|---|---|---|
| 1 | `00001_initial_schema.sql` | Cria todas as tabelas + grants |
| 2 | `00003_triggers_functions.sql` | `updated_at` automático + cria profile no signup |
| 3 | `00004_tenant_functions.sql` | RPCs `set_tenant`, `get_current_tenant_id`, `is_tenant_admin`, `has_permission`, `get_tenant_usage`, `create_tenant_with_setup` |
| 4 | `00002_rls_policies.sql` | Ativa RLS e cria policies |
| 5 | `00005_plans_and_billing.sql` | Seed dos 4 planos + features |
| 6 | `00006_super_admin_seed.sql` | (Opcional) Promove um usuário a super admin |

## Correções do guia já incluídas
- **#1**: `set_tenant` é chamado **uma vez por sessão** (não por query).
- **#3**: `tenant_users` sem `profile_id` redundante.
- **#4**: `create_tenant_with_setup` totalmente atômico (uma única RPC).
- **#5**: Slug usa `gen_random_uuid()` + retentativa — sem colisão temporal.
- **#6**: Todas as tabelas referenciadas no guia existem.
- **#7**: `members` e `transactions` com policies separadas por operação.
- **#8**: Soft delete (`deleted_at`) em `members`, `transactions`, `patrimonies`, `purchase_requests`, `minutes`. Policies já filtram.
- **#9**: `get_tenant_usage` retorna tudo em uma única chamada.

## Pós-instalação (no painel Supabase)
1. **Auth → URL Configuration** → Site URL: `https://zelarchurch.lovable.app` (e adicione `http://localhost:8080/**` em Redirect URLs).
2. **Auth → Providers → Email** → habilite. Para acelerar testes iniciais, desative "Confirm email".
3. **Storage** → crie buckets privados sob demanda: `member-photos`, `tenant-logos`, `receipts`, `minutes`.
4. **Verifique**: `SELECT slug, name FROM public.plans;` → 4 linhas.

## Como o app usa
O `src/integrations/supabase/client.ts` já expõe `initializeTenantSession(tenantId)` que chama `rpc('set_tenant', { tenant_id })` — invocar uma vez por login/troca de tenant.
