# Escalas Dinâmicas — Rodízio, Substituição e Relatórios

Estende o módulo existente (`schedules`, `schedule_members`, página `/app/escalas`) sem recriá-lo. Trabalho dividido em **4 entregas independentes** para revisar incrementalmente.

## Entrega 1 — Migration e fundação de dados

Arquivo: `db/migrations/00020_schedules_dynamic.sql`

- Nova tabela `department_instruments` (id, tenant_id, department_id, name, required, timestamps) — reaproveita o conceito de "funções de departamento" (00018) mas com flag `required`. Mantém `department_roles` intacta; instrumentos são uma camada específica para geração de escala.
- Nova tabela `member_instruments` (member_id, instrument_id, proficiency enum `principal|regular|substituto`, is_active).
- `schedule_members`: adicionar `instrument_id` (FK → department_instruments, nullable) e `attended` (boolean nullable, para assiduidade).
- `schedules`: adicionar `status` enum `draft|approved|sent` (default `draft`) e `generation_type` enum `manual|automatic` (default `manual`).
- Nova tabela `schedule_generation_logs` (params jsonb, result_summary jsonb, generated_by, timestamps).
- Nova tabela `schedule_substitutions` (schedule_member_id, requested_by, substitute_member_id, status `pending|accepted|rejected|escalated`, reason, timestamps).
- Função SQL `get_member_participation_count(member_id uuid, department_id uuid, before_date timestamptz)` → integer.
- RLS por tenant em todas, com `is_department_leader` para escrita onde aplicável; grants para `authenticated` + `service_role`.

## Entrega 2 — Cadastro de instrumentos e atribuição a membros

- `src/lib/instruments.ts`: CRUD `listInstruments`, `createInstrument`, `updateInstrument`, `deleteInstrument`, `listMemberInstruments`, `setMemberInstruments`.
- No `DepartmentMembersDialog`: nova aba/seção "Instrumentos" (visível ao líder) para gerenciar instrumentos do departamento e, por membro, marcar quais toca e a proficiência.

## Entrega 3 — Geração automática + UI do líder

- **Algoritmo no cliente** (TypeScript em `src/lib/scheduleGenerator.ts`), não Edge Function — o projeto usa TanStack Start/server functions, não Supabase Edge Functions (regra do template). Usa `get_member_participation_count` via RPC para o balanceamento.
- Inputs: department_id, start_date, end_date, days_of_week[], start_time, end_time, exclude_member_ids[].
- Para cada data válida × instrumento obrigatório: escolhe membro com menor participação histórica + maior tempo sem ser escalado; evita conflito de horário em outras escalas; marca data como incompleta se faltar.
- Retorna `{ suggestions, summary, incompleteDates }` e grava `schedule_generation_logs`.
- **Botão "Gerar Escala Automática"** em `/app/escalas` (só líderes), abrindo `ScheduleGeneratorDialog` em 3 etapas (Configuração → Rascunho editável com troca manual por instrumento → Aprovação).
- Aprovar = cria `schedules` (status `approved`, generation_type `automatic`) + `schedule_members` com `instrument_id` em transação.
- Botão "Enviar Escala" muda status para `sent` e insere notificações em `notifications` para cada membro escalado (usa `createNotification` existente).

## Entrega 4 — Visão do membro, substituição e relatórios

- Rota `/app/minhas-escalas`: próximas escalas do usuário logado com botões "Confirmar Presença" / "Solicitar Substituição".
- `SubstitutionDialog`: lista membros do mesmo departamento que tocam o mesmo `instrument_id` e estão livres na data/hora; envia `schedule_substitutions` (pending) + notifica substituto.
- Substituto vê em `/app/minhas-escalas` (seção "Solicitações") e Aceita (troca `member_id` em `schedule_members`, notifica solicitante) ou Recusa (notifica solicitante). Botão "Informar ao Líder" gera notificação ao `departments.leader_id`.
- Rota `/app/escalas/relatorios` (líderes): filtros departamento + intervalo; tabela de assiduidade (designadas, presenças confirmadas via `attended=true`, %), gráfico de barras Recharts, exportação PDF reusando o padrão do projeto.

## Detalhes técnicos

- **Sem Edge Function** — uso de Supabase client + RPC para `get_member_participation_count` respeita as regras do stack (TanStack Start não usa Edge Functions para lógica interna).
- Reaproveito `notifications`, `is_department_leader`, `has_permission`, `ScheduleMembersDialog` e o padrão de RLS das migrations 00018/00019.
- Compatível com PWA: apenas componentes shadcn já presentes; sem dependências novas além de `recharts` (já no projeto) e `jspdf` se ainda não estiver (verifico antes).

## Confirmações antes de começar

1. OK gerar tudo em **uma única resposta longa** (4 entregas seguidas) ou prefere **entrega por entrega**, revisando cada uma?
2. OK manter o algoritmo de geração no client (via RPC) em vez de Edge Function, conforme stack do projeto?
3. "Instrumento" e "Função do departamento" (00018) ficam como conceitos **separados** (instrumentos só para Louvor/escalas; funções para o resto), correto?
