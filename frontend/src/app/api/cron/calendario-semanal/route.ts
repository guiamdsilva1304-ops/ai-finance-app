import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Roteiro {
  hook: string;
  problema: string;
  virada: string;
  cta: string;
}

interface DiaContent {
  dia: string;
  data: string;
  pilar: string;
  formato: string;
  horario: string;
  titulo: string;
  objetivo: string;
  caption: string;
  slides?: string[];
  roteiro?: Roteiro;
  promptVisual: string;
  hashtags: string[];
}

interface CalendarData {
  semana: string;
  trends: string[];
  dias: DiaContent[];
}

// ─── TRENDING TOPICS ──────────────────────────────────────────────────────────

async function getTrendingTopics(weekDate: string): Promise<string[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-20250305',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Semana de ${weekDate}. Quais são os 5 principais assuntos em alta no Brasil relacionados a finanças pessoais, economia, investimentos ou comportamento financeiro? Responda APENAS com um array JSON de strings. Exemplo: ["assunto 1", "assunto 2"]`,
      }],
    }),
  });

  const data = await res.json();
  const text = data.content?.find((b: any) => b.type === 'text')?.text ?? '[]';
  try {
    const match = text.match(/\[[\s\S]*?\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [];
  }
}

// ─── GENERATE CALENDAR ────────────────────────────────────────────────────────

async function generateCalendar(trends: string[], weekDate: string): Promise<CalendarData> {
  const trendsList = trends.join(', ');

  const systemPrompt = `Você é o agente de conteúdo da iMoney — fintech brasileira de finanças pessoais com IA.
Seu trabalho é gerar o calendário editorial semanal seguindo o GUIA DE MARKETING iMONEY v3 2026 abaixo.
Responda APENAS com JSON válido. Sem markdown, sem texto antes ou depois, sem backticks.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GUIA DE MARKETING iMONEY — REFERÊNCIA COMPLETA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## POSICIONAMENTO
A iMoney NÃO é um app de planilha nem de controle de gastos.
A iMoney é a plataforma que ajuda o brasileiro a realizar sonhos e metas — usando IA como copiloto.
Enquanto concorrentes focam no passado (quanto você gastou), a iMoney olha pro futuro: onde você quer chegar.

Slogan principal: "Seus sonhos têm um plano. A iMoney cuida dele."
Eixo narrativo de TODO o conteúdo: Sonho → Plano → Conquista

## TOM DE VOZ
Personalidade: amigo próximo que acredita no potencial do usuário. Nunca gerente de banco, nunca coach chato.
- Aspiracional: foca no sonho, não no problema
- Próxima e humana: "Oi, Marina! Você tá a 3 meses da sua meta de viagem."
- Encorajadora: celebra cada progresso
- Direta e clara: conselhos aplicáveis, não teoria
- Sem julgamento: nunca culpa, reorienta
- Levemente bem-humorada: emoji certeiro, analogia do dia a dia

PALAVRAS QUE A iMONEY SEMPRE USA:
sonho, meta, conquista, jornada, realização, futuro, seu projeto de vida,
juntos, vamos, você consegue, mais perto, próximo passo, avançar, plano, rota, celebrar

PALAVRAS QUE A iMONEY NUNCA USA:
erro, falhou, gastou demais, irresponsável, culpa, dívida (sem contexto positivo),
algoritmo, machine learning, IA (sem humanizar), spread, amortização, drawdown

EVITAR (frio/bancário) vs USAR (humano/aspiracional):
❌ "Suas despesas superaram o orçamento em 23%." ✅ "Ei! Você gastou um pouco mais — quer ajustar sua meta?"
❌ "Recomendamos diversificação do portfólio." ✅ "Que tal começar a investir? Com R$100/mês você já dá um passo enorme."
❌ "Faça upgrade para ter acesso ilimitado" ✅ "Com o Pro, seu Assessor IA trabalha 24h pelo seu projeto de vida"
❌ "R$29,90/mês" ✅ "Menos de R$1/dia — o preço de um café — para ter um plano financeiro personalizado"
❌ "Assine agora" ✅ "Invista no seu sonho"

## PERSONA PRIMÁRIA — MARINA, 26 ANOS
Analista de marketing em SP. Renda R$3.500–R$6.000/mês. Aluga apartamento, solteira.
Sonhos: casa própria, viagem internacional, trocar de carro, parar de depender do cartão.
Dores: "O dinheiro some e não sei pra onde vai." Tentou planilha, não manteve. Medo de investir.
Comportamento: segue @mepoupenathalia, @thiagonigro. Usa muito Instagram e TikTok. Compra no impulso.
Como a iMoney ajuda: transforma "quero uma casa" em "guarde R$750/mês por 48 meses". Celebra cada R$750.

## FRAMEWORK SEPC — PILARES DE CONTEÚDO
S = Sonho (30%) — aspiração, identificação, metas de vida, simulações, antes/depois
E = Educação (35%) — SELIC, juros, CDI, como investir, reserva de emergência, conhecimento prático
P = Produto (20%) — demo do Assessor IA, criação de meta, dashboard em uso, features
C = Conquista (15%) — cases de usuários, milestones, celebrações, "X usuários realizaram Y"

## FEATURES REAIS DA iMONEY — ÚNICO CONTEÚDO PERMITIDO NO PILAR P
Posts de Produto (P) só podem mencionar o que existe hoje na plataforma.
PROIBIDO inventar, antecipar ou mencionar features em desenvolvimento.

EXISTE HOJE:
- Assessor IA: chat em linguagem natural que responde dúvidas financeiras e ajuda a planejar metas
  → Plano gratuito: 10 mensagens/dia | Plano Pro: ilimitado
- Dashboard: visão geral da saúde financeira do usuário
- Transações: registro e categorização de gastos e receitas
- Metas: criação de objetivos financeiros com acompanhamento de progresso
- Investimentos: registro da carteira de investimentos do usuário
- Renda: controle de receitas
- Plano Pro (R$29,90/mês): Assessor IA ilimitado + análises avançadas + relatórios + suporte prioritário

NÃO EXISTE (nunca mencionar):
- Open Finance / conexão bancária automática → está em waitlist, não está disponível
- Crédito, empréstimo ou financiamento de qualquer tipo
- Score ou análise de perfil Pix para crédito
- Investimentos automáticos ou recomendações de alocação
- Geração de vídeos, imagens ou qualquer conteúdo mídia
- Integração com corretoras ou bancos
- Pagamento de contas ou transferências
- Qualquer feature não listada acima

Quando o assunto em alta não se conectar a uma feature real, o post de Produto deve mostrar
o Assessor IA ou a criação de metas como solução — são as features mais versáteis.

## CALENDÁRIO EDITORIAL SEMANAL
- Terça → Instagram Carrossel — Pilar E ou S — publicar 19h–21h
- Quarta → TikTok / Reel — Pilar P (demo do app, rosto ou screen record) — qualquer hora
- Quinta → Instagram Carrossel — Pilar C ou S (motivação/conquista) — publicar 19h–21h
- Sexta → TikTok — Viral attempt: curiosidade financeira ou provocação — 18h–20h
- Domingo → TikTok / Story — Resumo da semana: SELIC, dólar, Ibovespa — 18h

## ESTRUTURA — CARROSSEL INSTAGRAM
- Slide 1 (CAPA): título que para o scroll — problema, promessa ou número chocante. Fundo #1a3a1a ou #FFFFFF.
- Slides 2–6: UMA ideia por slide, visual simples, texto grande e legível
- Slide 7 (opcional): resumo visual ou checklist
- Slide FINAL (CTA obrigatório): "@imoney_app | Baixe grátis — link na bio" — fundo #1a3a1a obrigatório
Nunca mais de 3 elementos por slide: número + ícone + título.

## ESTRUTURA — TIKTOK / REELS (45–60 segundos)
- Hook (0–2s): frase ou visual que para o scroll. Ex: "Você tá a X meses do seu sonho e não sabe."
- Problema (2–15s): mostrar a dor. O público precisa se ver na tela.
- Virada/Solução (15–35s): apresentar a iMoney como o caminho. Resultado ou funcionalidade.
- CTA (35–45s): UM único call-to-action. "Baixe grátis — link na bio." NUNCA dois CTAs.

## HASHTAGS — USAR EM TODOS OS POSTS
Instagram (5 hashtags): mix de volume — sempre incluir #iMoney + 4 das abaixo:
#financaspessoais #educacaofinanceira #dinheiro #sonhos #metas
#independenciafinanceira #appFinancas #fintech #mepoupe #reservadeemergencia
#investimentos #realizarsonhos

TikTok (4 hashtags): sempre incluir #iMoney + 3 das abaixo:
#financastiktok #dinheiro #sonhos #metas #investir #appdeFinancas #comoeconomizar #realizarsonhos

## IDENTIDADE VISUAL — REGRAS PARA PROMPT CLAUDE DESIGN

### Sistema de cores:
- Verde Escuro Principal: #1a3a1a (fundos, títulos, textos de autoridade)
- Verde Vibrante Acento: #00C853 (CTAs, botões, conquistas, números positivos)
- Branco Fundo: #FFFFFF (espaço negativo, clareza)
- Verde Claro Suporte: #E8F5E9 (backgrounds de cards, destaques sutis)
- Dourado Conquista: #F9A825 (EXCLUSIVO: meta atingida, upgrade Pro — NUNCA em outros slides)
Regra: 60% branco | 30% #1a3a1a | 8% #00C853 | 2% #F9A825 (só conquista)

### Tipografia — Nunito:
- Black 900: números e dados em destaque
- ExtraBold 800: títulos e headlines
- Bold 700: subtítulos e labels
- Regular 400: corpo de texto e descrições

### Proibições absolutas de design:
PROIBIDO: clay 3D, gradientes, sombras pesadas, bordas decorativas, texturas, qualquer efeito 3D
Ícones: flat design linha simples (outline), monocromático

### Zonas seguras (CRÍTICO):
- Feed/Carrossel 1080x1080px: margem mínima 100px em TODOS os lados. Área útil: 880x880px centralizada.
- Carrossel (borda de transição): 150px livres na borda DIREITA de todos os slides.
- Stories/Reels 1080x1920px: topo 250px e base 350px reservados para UI Instagram. Conteúdo entre y=250px e y=1570px.

### Elementos fixos em todos os slides:
- Número do slide: canto superior esquerdo, Nunito Black, #00C853, 48px
- Logo iMoney: canto inferior direito, 36px

### Especificações por tipo de slide:
Slide interno: fundo #FFFFFF | ExtraBold #1a3a1a 52-60px | #00C853 nos dados
CAPA: fundo #1a3a1a ou #FFFFFF | ExtraBold branco 56-64px | Subtítulo #E8F5E9 ou #00C853
CTA final: fundo #1a3a1a | ExtraBold branco 48-58px | URL em #00C853 36px
CONQUISTA: fundo #F9A825 | Black #1a3a1a 56-64px | Ícone troféu/estrela #1a3a1a
TABELA: fundo #E8F5E9 | Regular #374151 22px | Cabeçalho #1a3a1a com fundo escuro

### PROMPT BASE OBRIGATÓRIO — incluir no início de todo promptVisual de carrossel:
SISTEMA DE DESIGN iMONEY v3 2026 | Estilo: flat design brasileiro. PROIBIDO: clay 3D, gradientes, sombras pesadas, bordas decorativas, texturas. Canvas: 1080x1080px. Fundo padrão: #FFFFFF. ZONA SEGURA: margem mínima 100px em todos os lados. Área útil: 880x880px centralizada. 150px livres na borda direita (preview próximo slide). Cores: 60% branco | 30% #1a3a1a | 8% #00C853 | 2% #F9A825 (só conquista). Fonte: Nunito Black 900 números | ExtraBold 800 títulos | Bold 700 subtítulos | Regular 400 corpo. Ícones: flat design linha simples (outline), monocromático. SEM volume, SEM 3D, SEM sombra, SEM clay. Número slide: canto superior esquerdo, Nunito Black, #00C853, 48px. Logo iMoney: canto inferior direito, 36px. Máximo 3 elementos por slide: número + ícone + título.

### Estrutura obrigatória do promptVisual (5 partes):
1. ESTILO GLOBAL: flat design, sem gradientes, sem clay 3D, paleta iMoney
2. ESPECIFICAÇÕES DO CANVAS: dimensões, fundo (hex), tipografia Nunito, zona segura
3. ELEMENTOS DO SLIDE: número (posição + cor), ícone (descrição flat + cor), título (texto + peso + tamanho + cor)
4. RESTRIÇÕES: máximo 3 elementos, sem sombras, sem bordas decorativas
5. SLIDE ESPECIAL (se aplicável): CAPA / CTA / CONQUISTA / TABELA com regras específicas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHEMA JSON DE SAÍDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para Carrossel Instagram:
{
  "dia": "Terça",
  "data": "10/06",
  "pilar": "Educação",
  "formato": "Carrossel Instagram",
  "horario": "19h–21h",
  "titulo": "Título impactante que para o scroll",
  "objetivo": "Em 1 frase: o que este post vai fazer pelo usuário emocionalmente ou educativamente",
  "caption": "Caption completa. Tom próximo, aspiracional, sem jargão. CTA final claro. Máximo 4 linhas com emoji certeiro.",
  "slides": [
    "Slide 1 [CAPA — fundo #1a3a1a]: headline em ExtraBold branco que para o scroll",
    "Slide 2: insight 1 — texto exato como aparecerá no slide",
    "Slide 3: insight 2 — texto exato como aparecerá no slide",
    "Slide 4: insight 3 — texto exato como aparecerá no slide",
    "Slide 5 [CTA — fundo #1a3a1a]: @imoney_app | texto CTA | imoney.ia.br"
  ],
 "promptVisual": "SISTEMA DE DESIGN iMONEY v3 2026 | Estilo: flat design brasileiro. PROIBIDO: clay 3D, gradientes, sombras pesadas, bordas decorativas, texturas. Canvas: 1080x1080px. ZONA SEGURA: margem mínima 100px. Área útil: 880x880px. 150px livres borda direita. Cores: 60% branco | 30% #1a3a1a | 8% #00C853 | 2% #F9A825 (só conquista). Fonte: Nunito Black 900 números | ExtraBold 800 títulos | Bold 700 subtítulos | Regular 400 corpo. Ícones: flat design linha simples (outline), monocromático. SEM volume, SEM 3D, SEM sombra, SEM clay. Número slide: canto superior esquerdo, Nunito Black, #00C853, 48px. Logo iMoney: canto inferior direito, 36px. Máximo 3 elementos por slide.\n\nCARROSSEL 5 SLIDES — [TITULO EXATO DO TEMA]\n\nSLIDE 1 CAPA (fundo escuro): Fundo #1a3a1a. Número 01 #00C853 topo esq Nunito Black 48px. Ícone: [descrição exata do ícone flat outline, cor e tamanho ~240-260px, centralizado]. Título: [texto exato do slide 1] — ExtraBold branco 64px centralizado. Subtítulo: [texto exato do subtítulo] — Regular #E8F5E9 30px. Logo iMoney branca dir inf.\n\nSLIDE 2 [NOME DO CONCEITO]: Fundo #FFFFFF. Número 02 #00C853 topo esq Nunito Black 48px. Ícone: [descrição exata flat outline #1a3a1a ~240px centralizado]. Título: [texto exato do slide 2] — ExtraBold #1a3a1a 58px. Subtítulo: [texto exato do subtítulo] — Regular #555555 28px. Logo escura dir inf.\n\nSLIDE 3 [NOME DO CONCEITO]: Fundo #FFFFFF. Número 03 #00C853 topo esq. Ícone: [descrição exata flat outline #00C853 ~240px centralizado]. Título: [texto exato do slide 3] — ExtraBold #1a3a1a 58px. Subtítulo: [texto exato do subtítulo] — Regular #555555 28px. Logo escura dir inf.\n\nSLIDE 4 [NOME DO CONCEITO]: Fundo #FFFFFF. Número 04 #00C853 topo esq. Ícone: [descrição exata flat outline #1a3a1a ~250px centralizado]. Título: [texto exato do slide 4] — ExtraBold #1a3a1a 52px. Subtítulo: [texto exato do subtítulo] — Regular #555555 30px. Logo escura dir inf.\n\nSLIDE 5 CTA (fundo escuro): Fundo #1a3a1a obrigatório. Número 05 #00C853 topo esq. Ícone: bússola flat outline #00C853 ~200px centralizado. Título: [texto CTA exato alinhado ao sonho] — ExtraBold branco 58px. Subtítulo: imoney.ia.br — Black #00C853 36px. Logo iMoney branca centralizada abaixo.",

Para TikTok / Reel:
{
  "dia": "Quarta",
  "data": "11/06",
  "pilar": "Produto",
  "formato": "TikTok / Reel",
  "horario": "Qualquer hora",
  "titulo": "Título descritivo do vídeo",
  "objetivo": "Em 1 frase: o que este vídeo vai provocar ou ensinar",
  "caption": "Caption curta e direta. Tom próximo. CTA único. Máximo 2 linhas.",
  "roteiro": {
    "hook": "[0–2s] Frase que para o scroll — polêmica ou surpreendente.",
    "problema": "[2–15s] Mostrar a dor do público. 2–3 frases.",
    "virada": "[15–35s] Apresentar a iMoney. 3–4 frases com resultado concreto.",
    "cta": "[35–45s] UM único CTA. Baixe grátis — link na bio."
  },
  "hashtags": ["#iMoney", "#FinancasTikTok", "#Sonhos", "#RealizarSonhos"]
}`;

  const userPrompt = `Semana de ${weekDate}.
Assuntos em alta no Brasil esta semana: ${trendsList}.

Gere o calendário editorial para 5 dias:
- Terça → Carrossel Instagram — Pilar E ou S
- Quarta → TikTok/Reel — Pilar P (feature real da iMoney)
- Quinta → Carrossel Instagram — Pilar C ou S
- Sexta → TikTok — Pilar E (viral attempt)
- Domingo → TikTok — Resumo da semana (SELIC, dólar, tendências)

REGRAS:
- Integrar pelo menos 1 assunto em alta de forma natural
- Respeitar proporção SEPC: E=35% S=30% P=20% C=15%
- Tom sempre aspiracional — Sonho → Plano → Conquista
- Persona Marina: 26 anos, SP, quer realizar sonhos financeiros
- Cada promptVisual deve incluir o PROMPT BASE e as 5 partes estruturadas
- Caption com 5 hashtags (Instagram) ou 4 hashtags (TikTok)
- NUNCA usar: clay 3D, gradientes, "Assine agora", features inexistentes

Responda com JSON exato:
{
  "semana": "${weekDate}",
  "trends": ${JSON.stringify(trends)},
  "dias": [ ...5 objetos conforme schema acima... ]
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.find((b: any) => b.type === 'text')?.text ?? '';
  const clean = text.replace(/```json[\s\S]*?```/g, (m: string) =>
    m.replace(/```json\n?/, '').replace(/\n?```/, '')
  ).trim();
  return JSON.parse(clean);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const PILAR_COLORS: Record<string, { bg: string; text: string }> = {
  'Sonho':     { bg: '#7C3AED', text: '#FFFFFF' },
  'Educação':  { bg: '#00C853', text: '#FFFFFF' },
  'Produto':   { bg: '#F59E0B', text: '#FFFFFF' },
  'Conquista': { bg: '#F9A825', text: '#1a3a1a' },
};

function renderHashtags(hashtags: string[]): string {
  return hashtags.map(tag => {
    const isImoney = tag.toLowerCase().includes('imoney');
    return `<span style="display:inline-block;background:${isImoney ? '#1a3a1a' : '#E8F5E9'};color:${isImoney ? '#00C853' : '#1a3a1a'};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin:0 4px 6px 0;font-family:Arial,sans-serif;">${tag}</span>`;
  }).join('');
}

function renderSlides(slides: string[]): string {
  return slides.map((slide, i) => {
    const isCapa = i === 0;
    const isCTA  = i === slides.length - 1;
    const isDark = isCapa || isCTA;
    return `<li style="margin:0 0 8px 0;list-style:decimal;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:${isDark ? '#FFFFFF' : '#374151'};background:${isDark ? '#1a3a1a' : '#FFFFFF'};padding:10px 14px;border-radius:8px;border-left:3px solid #00C853;">${slide}</li>`;
  }).join('');
}

function renderRoteiro(roteiro: Roteiro): string {
  const cenas = [
    { label: 'gancho',   tempo: '0–2s',   texto: roteiro.hook },
    { label: 'contexto', tempo: '2–15s',  texto: roteiro.problema },
    { label: 'virada',   tempo: '15–35s', texto: roteiro.virada },
    { label: 'CTA',      tempo: '35–45s', texto: roteiro.cta },
  ];
  return cenas.map((c, i) =>
    `<li style="margin:0 0 10px 0;list-style:decimal;font-family:Arial,sans-serif;font-size:13px;color:#374151;line-height:1.5;padding:10px 14px;background:#FFFFFF;border-radius:8px;border-left:3px solid #00C853;"><strong style="color:#1a3a1a;">Cena ${i + 1} — ${c.label}</strong> <span style="color:#9CA3AF;font-size:11px;">${c.tempo}</span><br/>${c.texto}</li>`
  ).join('');
}

function renderDay(dia: DiaContent): string {
  const pilarColor = PILAR_COLORS[dia.pilar] ?? { bg: '#00C853', text: '#FFFFFF' };
  const isCarrossel = dia.formato?.toLowerCase().includes('carrossel');
  const contentHTML = isCarrossel
    ? `<ol style="margin:0;padding-left:22px;">${renderSlides(dia.slides ?? [])}</ol>`
    : `<ol style="margin:0;padding-left:22px;">${renderRoteiro(dia.roteiro ?? { hook:'', problema:'', virada:'', cta:'' })}</ol>`;
  const contentIcon  = isCarrossel ? '📌' : '🎬';
  const contentLabel = isCarrossel ? 'Slides:' : 'Script:';
  const captionClean = (dia.caption ?? '').split('\n\n')[0].trim();

  return `<div style="background:#FFFFFF;border-radius:12px;padding:22px 24px;margin-bottom:20px;border:1px solid #E5E7EB;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <div style="margin-bottom:14px;">
      <span style="background:${pilarColor.bg};color:${pilarColor.text};font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;font-family:Arial,sans-serif;margin-right:8px;">${dia.pilar}</span>
      <span style="background:#F3F4F6;color:#6B7280;font-size:12px;font-weight:600;padding:4px 14px;border-radius:20px;border:1px solid #E5E7EB;font-family:Arial,sans-serif;margin-right:8px;">${dia.formato}</span>
      <span style="color:#9CA3AF;font-size:12px;font-family:Arial,sans-serif;">🕐 ${dia.horario}</span>
    </div>
    <p style="margin:0 0 6px 0;font-size:17px;font-weight:700;color:#1a3a1a;font-family:Arial,sans-serif;line-height:1.3;">${dia.dia} ${dia.data} — ${dia.titulo}</p>
    <p style="margin:0 0 18px 0;font-size:13px;color:#6B7280;font-style:italic;font-family:Arial,sans-serif;line-height:1.5;">${dia.objetivo}</p>
    <div style="background:#F0FDF4;border-left:4px solid #00C853;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:18px;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#1a3a1a;font-family:Arial,sans-serif;">✏️ Caption:</p>
      <p style="margin:0;font-size:13px;color:#374151;font-family:Arial,sans-serif;line-height:1.7;white-space:pre-line;">${captionClean}</p>
    </div>
    <div style="margin-bottom:18px;">
      <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#1a3a1a;font-family:Arial,sans-serif;">${contentIcon} ${contentLabel}</p>
      ${contentHTML}
    </div>
    <div style="background:#FFFBEB;border-radius:8px;padding:12px 16px;margin-bottom:16px;border:1px solid #FDE68A;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#92400E;font-family:Arial,sans-serif;">🎨 Prompt Visual:</p>
      <p style="margin:0;font-size:12px;color:#78350F;font-style:italic;font-family:Arial,sans-serif;line-height:1.7;">${dia.promptVisual}</p>
    </div>
    <div>${renderHashtags(dia.hashtags ?? [])}</div>
  </div>`;
}

// ─── BUILD EMAIL HTML ──────────────────────────────────────────────────────────

function buildEmailHTML(data: CalendarData): string {
  const trendsHTML = data.trends.map(t =>
    `<li style="margin:0 0 5px 0;font-size:13px;color:#374151;font-family:Arial,sans-serif;list-style:none;">📈 ${t}</li>`
  ).join('');

  const daysHTML = (data.dias ?? []).map(renderDay).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
<div style="max-width:680px;margin:0 auto;padding:24px 16px;">
  <div style="background:#1a3a1a;border-radius:12px;padding:24px;margin-bottom:20px;text-align:center;">
    <p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#FFFFFF;font-family:Arial,sans-serif;">🗓️ Calendário Editorial</p>
    <p style="margin:0;font-size:14px;color:#00C853;font-family:Arial,sans-serif;font-weight:600;">Semana de ${data.semana}</p>
  </div>
  <div style="background:#FFFFFF;border-radius:10px;padding:14px 18px;margin-bottom:20px;border-left:4px solid #00C853;">
    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-family:Arial,sans-serif;">📈 Em alta esta semana</p>
    <ul style="margin:0;padding:0;">${trendsHTML}</ul>
  </div>
  <div style="background:#FFFFFF;border-radius:10px;padding:12px 18px;margin-bottom:20px;border-left:4px solid #00C853;">
    <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-family:Arial,sans-serif;">Pilares SEPC</p>
    <p style="margin:0;font-size:12px;color:#555;font-family:Arial,sans-serif;line-height:1.9;">
      🌟 <strong>S = Sonho</strong> (30%) &nbsp;·&nbsp;
      📚 <strong>E = Educação</strong> (35%) &nbsp;·&nbsp;
      📱 <strong>P = Produto</strong> (20%) &nbsp;·&nbsp;
      🏆 <strong>C = Conquista</strong> (15%)
    </p>
  </div>
  ${daysHTML}
  <div style="text-align:center;padding:20px 0 8px 0;">
    <p style="color:#00C853;font-size:14px;font-weight:700;margin:0 0 4px 0;font-family:Arial,sans-serif;">iMoney · imoney.ia.br</p>
    <p style="color:#9CA3AF;font-size:12px;margin:0;font-style:italic;font-family:Arial,sans-serif;">"Seus sonhos têm um plano. A iMoney cuida dele."</p>
  </div>
</div>
</body>
</html>`;
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekDate = now.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    console.log(`[calendario-semanal] Iniciando para a semana de ${weekDate}`);

    const trends = await getTrendingTopics(weekDate);
    console.log('[calendario-semanal] Trends:', trends);

    const calendarData = await generateCalendar(trends, weekDate);
    console.log('[calendario-semanal] Calendário gerado');

    const emailHTML = buildEmailHTML(calendarData);

    await resend.emails.send({
      from: 'iMoney <gui@imoney.ia.br>',
      to: ['guiamdsilva1304@gmail.com'],
      subject: `📅 Calendário Editorial — Semana de ${weekDate}`,
      html: emailHTML,
    });

    console.log('[calendario-semanal] Email enviado com sucesso');
    return NextResponse.json({ ok: true, semana: weekDate, dias: calendarData.dias?.length });

  } catch (err: any) {
    console.error('[calendario-semanal] Erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
