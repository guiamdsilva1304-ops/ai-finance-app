# iMoney — Next.js + FastAPI

Stack completa de produção para o iMoney.

## Arquitetura

```
┌─────────────────────────────────────────────┐
│  Next.js 14 (Vercel)                        │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │  App Router  │  │   API Routes       │   │
│  │  /dashboard  │  │  /api/chat         │   │
│  │  /auth       │  │  /api/rates/eco    │   │
│  │  /openfinance│  │  /api/openfinance/ │   │
│  └──────────────┘  └────────────────────┘   │
└────────────────────────┬────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────┐
│  FastAPI (Railway / Render)                 │
│  /api/eco   /api/fx   /api/diagnostico      │
│  /api/categorizar   /health                 │
└────────────────────────┬────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Supabase          Anthropic         Pluggy
 (Auth + DB)      (Claude Sonnet)  (Open Finance)
```

## Setup rápido

### 1. Next.js Frontend

```bash
cd imoney-next
npm install
cp .env.local.example .env.local
# Edite .env.local com suas chaves
npm run dev
```

### 2. FastAPI Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

| Variável | Onde obter |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → Project Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase.com → Project Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase.com → Project Settings |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `PLUGGY_CLIENT_ID` | dashboard.pluggy.ai |
| `PLUGGY_CLIENT_SECRET` | dashboard.pluggy.ai |
| `FASTAPI_URL` | URL do seu backend FastAPI |

### 4. Supabase

Execute o `schema.sql` do projeto Streamlit no SQL Editor do Supabase — as tabelas são as mesmas.

## Deploy

### Frontend → Vercel
```bash
vercel --prod
# Adicione as env vars no painel da Vercel
```

### Backend → Railway
```bash
# No Railway, crie um novo serviço Python
# Aponte para /backend
# Adicione as mesmas env vars
# Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Estrutura de pastas

```
src/
├── app/
│   ├── page.tsx                  # Login/Auth
│   ├── layout.tsx
│   ├── globals.css
│   ├── dashboard/
│   │   ├── layout.tsx            # Sidebar wrapper
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── assessor/page.tsx     # Chat IA
│   │   ├── transacoes/page.tsx   # Transações
│   │   ├── metas/page.tsx        # Metas
│   │   ├── investimentos/page.tsx
│   │   ├── renda/page.tsx        # Renda variável
│   │   ├── perfil/page.tsx       # Perfil do usuário
│   │   └── openfinance/page.tsx  # Pluggy Connect
│   └── api/
│       ├── chat/route.ts         # IA chat (seguro)
│       ├── rates/eco/route.ts    # Proxy BCB
│       ├── rates/fx/route.ts     # Câmbio AwesomeAPI
│       └── openfinance/
│           ├── token/route.ts    # Pluggy connect token
│           └── items/[id]/route.ts
├── components/
│   ├── ui/
│   │   ├── Logo.tsx
│   │   └── MetricCard.tsx
│   └── layout/
│       └── Sidebar.tsx
├── lib/
│   ├── supabase.ts
│   └── utils.ts
└── types/index.ts

backend/
├── main.py                       # FastAPI app
└── requirements.txt
```

## Segurança

- **Anthropic API key**: server-side only em `/api/chat`
- **Pluggy API key**: server-side only em `/api/openfinance/token`
- **Supabase service role**: server-side only
- **IDOR prevention**: todas as rotas verificam ownership via `user_id`
- **Rate limiting**: 30 msgs/hora no chat (em memória + pode usar Redis)
- **Input sanitization**: sanitização em todas as rotas
