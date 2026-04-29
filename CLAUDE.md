# iMoney — Documento Mestre para Agentes de IA

> Este arquivo é lido automaticamente pelo Claude Code e por todos os agentes da iMoney antes de qualquer ação. Define quem somos, o que construímos, como trabalhamos e quais são as regras do jogo.

## 1. QUEM SOMOS

**iMoney** é uma fintech brasileira de inteligência financeira pessoal com IA.

- **Fundador:** Gui Moreira
- **Missão:** Ajudar brasileiros de 25-40 anos a controlar melhor suas finanças com IA real
- **Diferencial:** Assessor de IA (Claude Sonnet) integrado a dados financeiros reais do usuário
- **Modelo:** Freemium → iMoney Pro R$29/mês → B2B (contadores/corretoras)
- **Fase:** Early stage. Foco em crescimento de usuários e awareness no Instagram

## 2. ESTADO ATUAL

| Métrica | Valor |
|---------|-------|
| Usuários | 2 |
| Transações | 7 |
| Metas | 6 |
| Chats com IA | 12 |
| Posts gerados | 7 |
| MRR | R$ 0 |

## 3. STACK TÉCNICA

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router) |
| Banco | Supabase (PostgreSQL + RLS) |
| IA principal | claude-sonnet-4-6 |
| IA marketing | claude-haiku-4-5-20251001 |
| Imagens | OpenAI gpt-image-1 (retorna base64) |
| Deploy | Vercel Hobby (timeout 10s) |
| Email | Resend |
| Storage | Supabase (bucket: imoney-media) |

**URLs:**
- Produção: https://ai-finance-app-ashen.vercel.app
- Supabase: https://xckjwhlpijzkimwgoews.supabase.co
- Repo: github.com/guiamdsilva1304-ops/ai-finance-app
- Frontend: /frontend (dentro do repo)

## 4. ESTRUTURA DO PROJETO
/frontend/src/app
/admin
/agentes     → Interface multi-agent Nível 5
/marketing   → Pipeline de aprovação de posts
/marca       → Upload da logo oficial
/dashboard
/assessor    → Chat com IA financeira
/transacoes  → Gestão de gastos
/metas       → Objetivos financeiros
/api
/agents/run          → Executa agentes
/agents/marketing    → Gera posts Instagram
/agents/marketing/image → Gera imagens gpt-image-1 + sharp
/brand/logo          → Upload/leitura da logo
/chat                → Assessor IA do usuário
/dashboard/summary   → Dados do dashboard
/rates/eco           → SELIC/IPCA BCB
/cron/emails         → Emails automáticos
/cron/agents         → Briefing diário 9h
## 5. OS 6 AGENTES

| Agente | Papel | Foco |
|--------|-------|------|
| Ana | COO | Briefing executivo, KPIs, prioridades |
| Kai | CTO | Bugs, infra, diagnóstico técnico |
| Lucas | CMO | Posts Instagram, conteúdo |
| Pedro | CFO | Unit economics, custos, receita |
| Maya | CPO | Produto, features, UX |
| Julia | Head CS | Email usuários, retenção |

## 6. REGRAS DE DESENVOLVIMENTO

### Modelos
- Agentes e assessor: `claude-sonnet-4-6`
- Marketing (velocidade): `claude-haiku-4-5-20251001`
- Imagens: `gpt-image-1` (retorna `b64_json`, não URL)

### Vercel Hobby — timeout 10s
- Usar Haiku em rotas críticas (responde em 3s vs 15s do Sonnet)
- `maxDuration = 60` configurado mas só funciona no Pro

### Parser JSON do Claude
```typescript
const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
const clean = jsonMatch ? jsonMatch[0] : text.replace(/```json|```/g, "").trim();
```

### Imagens
- gpt-image-1 retorna base64 → usar `sharp` para compor logo
- Logo oficial: `imoney-media/brand/logo.png` no Supabase Storage
- Sempre salvar imagem final no bucket `imoney-media`

## 7. IDENTIDADE VISUAL

- **Cores:** Verde escuro #1a3a1a, verde vibrante #00C853, branco #FFFFFF
- **Fonte app:** Nunito | **Fonte posts:** Impact/Anton bold
- **Logo:** Bússola verde com cifrão $ no centro, flor de lis no topo, 4 pontas, gradiente verde, texto "iMoney" abaixo
- **Posts:** Fundo branco, texto bold verde escuro gigante, ícones 3D verdes, logo canto inferior direito

## 8. ESTRATÉGIA DE MARKETING

**Canal:** Instagram | **Público:** Brasileiros 25-40 anos

| Dia | Formato | Tema |
|-----|---------|------|
| Dom | Carrossel | Planejamento semanal |
| Seg | Carrossel | Conceito financeiro |
| Ter | Single post | Dado chocante |
| Qua | Single post | Frase impactante |
| Qui | Carrossel | Tutorial passo a passo |
| Sex | Carrossel | Comparativo financeiro |
| Sáb | Single post | Erro financeiro comum |

## 9. OBJETIVOS 30 DIAS

| Meta | Alvo | Status |
|------|------|--------|
| Usuários | 50 | 🔴 2/50 |
| Posts/semana | 7 | 🟡 Em construção |
| MRR | R$ 290 | 🔴 R$ 0 |

## 10. PRÓXIMOS PASSOS

1. Integração Google Veo 3.1 — Reels em vídeo
2. Primeiro usuário pagante — ativar iMoney Pro
3. Open Finance — integração via Pluggy
4. Claude Code — autonomia do Kai para commits

## 11. VARIÁVEIS DE AMBIENTE
ANTHROPIC_API_KEY
OPENAI_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
CRON_SECRET
*Última atualização: Abril 2026*
