# Fluxos de Onboarding — Zelar

A partir da Fase 12, novos usuários podem entrar no Zelar por **três caminhos
diretos**, sem necessidade de digitar CNPJ, buscar igrejas pelo nome, ou
aguardar criação manual de conta pelo pastor.

## 1. QR Code da igreja (`access_codes`)

- O admin (pastor/líder) gera um código `ZLR-XXXXXX` em `/app/invitations`.
- Cada código pode ser:
  - **Sem aprovação** (`requires_approval=false`, padrão): novo usuário entra
    direto como membro ativo após o cadastro.
  - **Com aprovação**: gera um registro em `membership_requests`, e o usuário
    fica em `/app/welcome` aguardando liberação.
- O admin compartilha o QR (impresso ou em tela). A URL embutida é
  `https://<dominio>/join/<code>`.
- Usuário escaneia → abre `/join/$code` → cria conta → entra na igreja certa.
- Leitura via câmera no app usa `BarcodeDetector` quando disponível
  (`src/components/QrScanButton.tsx`); fallback para entrada manual.

## 2. Link de convite gerado por membro (`invitations`)

- Qualquer membro ativo pode gerar um link em `InviteMemberButton` (header).
- Backend: RPC `generate_member_invite(member_id, expires_hours)` cria um
  token UUID em `invitations` com `max_uses=1` e expiração de 48h por padrão.
- URL gerada: `https://<dominio>/invite/<token>`.
- Compartilhado via Web Share API ou WhatsApp.
- Ao abrir:
  - Logado: RPC `accept_invitation` vincula o usuário e redireciona a `/app`.
  - Deslogado: form simples de signup + `public_join_tenant`, em uma única
    transação, garantindo vínculo correto à igreja do convidante.

## 3. Onboarding por localização (estado/cidade)

- Primeira abertura do app (sem sessão) → `/onboarding`.
- O usuário escolhe **Estado → Cidade → Igreja** entre as igrejas cadastradas
  daquela localidade.
- Em seguida preenche nome/e-mail/senha. RPC `public_join_tenant` cria
  perfil, membership e member em uma única chamada.
- Página acessível também pela landing pública em `/` (seção
  "Entre na sua igreja em segundos").

## Roteamento e redirecionamentos

| Origem | Destino | Quando |
|---|---|---|
| `/app/*` sem sessão | `/onboarding` | Default para novos usuários |
| `/auth` | `/select-tenant` | Após login |
| `/register?code=ZLR-XXX` | `/join/$code` | Compatibilidade |
| `/register?invite=<token>` | `/invite/$token` | Compatibilidade |
| `/onboarding` (botão "Já tenho conta") | `/auth` | Login direto |

## Fluxos legados removidos

Não há mais busca de igreja por **CNPJ** ou **nome livre** para novos
membros. Esses caminhos eram suscetíveis a vínculo na igreja errada. O
`/register` permanece **apenas** como fluxo de cadastro de pastor/líder
(criação de uma nova igreja no Zelar).

## Roteiro de testes manuais

1. **PWA + localização**: instalar PWA → abrir → estado SP → cidade São Paulo
   → escolher igreja → cadastrar → cair em `/app/welcome`.
2. **Convite de membro**: logar como membro → gerar link → abrir em janela
   anônima → cadastrar → conferir vínculo na igreja correta.
3. **QR Code (sem aprovação)**: admin gera código com `requires_approval=false`
   → escanear → cadastrar → entrar direto em `/app`.
4. **QR Code (com aprovação)**: idem, mas `requires_approval=true` →
   usuário fica em `/app/welcome` "aguardando aprovação" até o admin
   chamar `approve_membership_request`.
