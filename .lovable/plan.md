
## Objetivo

Aplicar a mesma identidade visual da landing page (glassmorphism, sombras difusas, animações de entrada, hover-lift, paleta Azul Royal `#1E3A5F` + Dourado `#C8963E`, gradientes sutis) em todas as páginas do sistema — autenticação, seleção de tenant, planos e todo o painel interno (`/app/*`).

## Escopo das páginas

**Públicas / fluxo de entrada**
- `auth.tsx` — login/cadastro
- `register.tsx` — onboarding de igreja
- `pricing.tsx` — planos
- `select-tenant.tsx` — seleção de igreja

**Painel autenticado (`/app/*`)**
- Shell: `app.tsx` + `AppSidebar.tsx` (sidebar dark navy com destaques dourados, header glass, breadcrumb animado)
- Dashboard: `app.index.tsx`
- Membros, Departamentos, Escalas, Financeiro (índice, contas, centros, relatórios), EBD, Check-in, Atas, Convocações, Conselho Fiscal, Patrimônio, Compras, Relatórios, Notificações, Auditoria, Perfil, Configurações

## Estratégia (sem reescrever cada página)

Para evitar editar 25+ rotas individualmente, a maior parte do efeito virá de **primitivos compartilhados + tokens globais**:

### 1. Tokens globais (`src/styles.css`)
- Garantir paleta exata: `--primary` = `#1E3A5F`, `--accent`/dourado = `#C8963E`, fundo off-white `#fafaf7`.
- Adicionar sombras "soft": `--shadow-soft`, `--shadow-elevated`, `--shadow-gold`.
- Sidebar tokens dark navy com accent dourado.
- Keyframes globais: `fade-in-up`, `float`, `shimmer` + utilitários `.hover-lift`, `.glass`, `.glass-strong`.

### 2. Componentes shadcn refinados (afetam tudo de uma vez)
- `card.tsx` — variante padrão com borda translúcida, backdrop-blur, sombra difusa, hover-lift sutil.
- `button.tsx` — CTA dourado padrão com sombra `gold-glow` e translate no hover; variante outline glass.
- `input.tsx` / `select.tsx` / `textarea.tsx` — borda suave, focus ring dourado, fundo levemente translúcido.
- `dialog.tsx` / `sheet.tsx` / `popover.tsx` — backdrop blur mais forte, borda glass.
- `table.tsx` — header com fundo navy/5, linhas com hover suave.
- `badge.tsx` — variantes com tons da marca.
- `tabs.tsx` — indicador animado dourado.

### 3. Shell do app (`app.tsx` + `AppSidebar.tsx`)
- Sidebar: fundo navy escuro com gradiente sutil, item ativo com pill dourado, logo Zelar no topo, divisores translúcidos.
- Header do app: glass sticky com blur, busca/notificações com hover dourado.
- Fundo da área de conteúdo: gradient mesh muito sutil (radial blobs navy/dourado em opacidade baixa).
- Wrapper de página com animação `fade-in-up` no `<Outlet />` por chave de rota.

### 4. Páginas de auth/onboarding (impacto visual direto)
- `auth.tsx`, `register.tsx`, `select-tenant.tsx`: layout split com painel lateral escuro (navy + foto Unsplash com blend overlay + slogan "Gestão com Fidelidade") e formulário em card glass do lado oposto.
- `pricing.tsx`: cards de plano com hover-lift, plano recomendado em destaque dourado e badge "Mais escolhido".

### 5. Animações de entrada nas páginas internas
- Criar `<PageTransition>` simples (framer-motion) usado em `app.tsx` ao redor do `<Outlet />` → fade-in + slide-up curto a cada mudança de rota.
- Tabelas e cards do dashboard: `motion.div` com `whileInView` stagger leve onde já há listas.

## Detalhes técnicos

- Continuar usando `framer-motion` (já instalado) para transições e hover; nada de novas dependências.
- Manter todos os tokens via CSS vars — nenhum hex hardcoded em componente novo (só nos tokens em `styles.css`).
- Preservar 100% da lógica de negócio, rotas, schemas e chamadas a server functions. Mudanças apenas em markup/classes/tokens.
- Acessibilidade: contraste mantido (texto sobre navy = branco, sobre off-white = navy escuro), foco visível com ring dourado.
- Performance: blurs aplicados em áreas pequenas/fixas (sidebar, headers, modais), nunca no body inteiro.

## Ordem de execução

1. Tokens + utilitários globais em `styles.css`.
2. Refino dos primitivos shadcn (card, button, input, dialog, table, tabs, badge).
3. Shell `app.tsx` + `AppSidebar.tsx` + `PageTransition`.
4. `auth.tsx`, `register.tsx`, `select-tenant.tsx`, `pricing.tsx`.
5. Polimento do dashboard (`app.index.tsx`) — cards de KPI, gráficos com a paleta nova.
6. Verificação visual rápida nas rotas principais.

## Fora do escopo

- Redesenho página-a-página com layouts totalmente novos das telas internas (membros, financeiro, etc.) — elas herdarão o visual pelos primitivos e pelo shell. Se quiser depois um redesenho dedicado de telas específicas, fazemos em prompts separados.

Posso seguir com este plano?
