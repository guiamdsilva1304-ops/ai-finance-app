# iMoney — instruções para o Claude Code

## O projeto
App brasileiro de finanças pessoais com IA voltado para jovens de 20–30 anos.
Stack: Next.js 14 (App Router) + Supabase + Anthropic API (Claude Sonnet) + Vercel + Resend.
Frontend em `/frontend`. Fonte: Nunito. Design: branco e verde (#1D9E75).

## Estrutura principal
- `/frontend/src/app` — páginas Next.js (App Router)
- `/frontend/src/app/api` — API routes
- `/frontend/src/app/admin` — painel admin (protegido)
- `/frontend/src/app/dashboard` — área logada do usuário

## Páginas existentes
/, /login, /dashboard, /dashboard/assessor, /dashboard/transacoes,
/dashboard/metas, /dashboard/investimentos, /dashboard/perfil,
/dashboard/renda, /dashboard/openfinance, /admin, /admin/agentes

## Tabelas Supabase
user_memory, transactions, metas, user_profiles, user_investments,
chat_history, pluggy_connections, openfinance_interest, email_queue, admin_posts

## Variáveis de ambiente (nunca expor no código)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
ANTHROPIC_API_KEY, RESEND_API_KEY, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY

## O que o Claude Code pode fazer sozinho (sem pedir confirmação)
- Corrigir erros de TypeScript e lint
- Corrigir bugs identificados nos logs do Vercel
- Atualizar dependências com vulnerabilidades
- Melhorar performance de queries Supabase
- Adicionar tratamento de erros faltando
- Fazer commit e push após cada correção

## O que o Claude Code DEVE perguntar antes de fazer
- Mudanças de design ou layout
- Novas features ou páginas
- Mudanças em variáveis de ambiente
- Alterações em políticas RLS do Supabase
- Qualquer mudança na lógica de pagamento

## Padrões de código
- TypeScript estrito — sem `any`
- Componentes com inline styles (padrão do projeto)
- Queries Supabase sempre com tratamento de erro
- API routes sempre validam input antes de processar
- Commits no formato: `fix: descrição` ou `feat: descrição`

## Modelo de IA
Sempre usar `claude-sonnet-4-6` nas API routes
(exceção: rotas de baixo custo — blog, autoresearch — usam `claude-haiku-4-5-20251001`).
Max tokens: 4096 para respostas longas, 1024 para respostas curtas.

## Burn e contexto de negócio
- Burn mensal: R$ 660
- Break-even: 22 usuários pagantes a R$ 29,90/mês
- Meta: 100 pagantes em 6 meses, R$ 1M faturado em 24 meses
- Prioridade máxima: estabilidade do produto e retenção de usuários
