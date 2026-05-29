import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const resend = new Resend(process.env.RESEND_API_KEY!);

// ─── BRAND CONTEXT ──────────────────────────────────────────────────────────

const IMONEY_CONTEXT = `
=== GUIA DE MARCA iMONEY v3 2026 ===

POSICIONAMENTO: A iMoney transforma sonhos financeiros em planos concretos usando IA. Não é app de controle de gastos — é plataforma de realização de sonhos. Enquanto concorrentes focam no passado (o que você gastou), a iMoney foca no futuro (onde você quer chegar).

SLOGAN: "Seus sonhos têm um plano. A iMoney cuida dele."

TOM DE VOZ: Amigo próximo que acredita no potencial do usuário. Aspiracional, humano, encorajador, direto, sem julgamento, levemente bem-humorado. NUNCA bancário, NUNCA técnico sem humanizar. NUNCA culpa o usuário.

EIXO NARRATIVO: Sonho → Plano → Conquista

PERSONA PRIMÁRIA: Marina, 26 anos, analista de marketing, São Paulo. Renda R$3.500–R$6.000. Sonhos: casa própria, viagem internacional, independência financeira. Segue @mepoupenathalia e @thiagonigro. Usa muito TikTok e Instagram. Compra no impulso. Tentou planilha mas não manteve.

FRAMEWORK SEPC:
- S (Sonho) 30%: aspiração, identificação, simulações de metas, antes/depois, provocações sobre o futuro
- E (Educação) 35%: SELIC, CDI, inflação, como investir, reserva de emergência, juros compostos, conceitos explicados de forma simples
- P (Produto) 20%: demos do Assessor IA, criação de metas no app, dashboard em uso real
- C (Conquista) 15%: cases de usuários, milestones da iMoney, resultados concretos

CALENDÁRIO SEMANAL:
- Terça: Instagram Carrossel (pilar E ou S) → publicar 19h–21h
- Quarta: TikTok/Reel (pilar P — demo do app) → qualquer hora
- Quinta: Instagram Carrossel (pilar C ou motivação) → publicar 19h–21h
- Sexta: TikTok (viral: curiosidade ou provocação financeira) → 18h–20h
- Domingo: TikTok (resumo SELIC/dólar/Ibovespa da semana + 1 insight) → 18h

=== IDENTIDADE VISUAL ===

CORES:
- #1a3a1a Verde Escuro (30%): fundos premium, títulos de autoridade
- #00C853 Verde Vibrante (8%): CTAs, números positivos, destaques
- #FFFFFF Branco (60%): fundo padrão, espaço negativo
- #E8F5E9 Verde Claro: backgrounds de cards sutis
- #F9A825 Dourado (2%): EXCLUSIVO para conquistas/celebrações — NUNCA em outros slides

TIPOGRAFIA: Nunito (Black 900 para números, ExtraBold 800 para títulos, Bold 700 para subtítulos, Regular 400 para corpo)

CANVAS: 1080x1080px (carrosséis e posts), 1080x1920px (stories)

PROIBIDO ABSOLUTAMENTE: clay 3D, gradientes, sombras pesadas, bordas decorativas, texturas, volume
ÍCONES: flat design linha simples (outline), monocromático na paleta da marca — sem volume, sem 3D

ESTRUTURA FIXA DE CADA SLIDE:
- Número: canto superior esquerdo, Nunito Black, cor #00C853, 48px
- Logo iMoney: canto inferior direito, bússola flat + texto "iMoney", 36px
- MÁXIMO 3 elementos por slide: número + ícone + título. NUNCA ultrapassar isso.

TIPOS DE SLIDE E FUNDOS:
- Slide interno: fundo #FFFFFF, título ExtraBold #1a3a1a 52–60px, dados/destaques em #00C853
- CAPA (slide 1): fundo #1a3a1a ou #FFFFFF, título ExtraBold branco/escuro 56–64px, subtítulo em #00C853 ou #E8F5E9
- CTA (último slide): fundo #1a3a1a OBRIGATÓRIO, texto ExtraBold branco 48–58px, URL em #00C853 36px
- CONQUISTA: fundo #F9A825, texto Black #1a3a1a 56–64px — NUNCA usar dourado em outros slides

PROMPT-BASE CLAUDE DESIGN (incluir no início de TODOS os prompts):
"SISTEMA DE DESIGN iMONEY — GUIA OFICIAL v3 2026. Estilo: flat design brasileiro. PROIBIDO: clay 3D, gradientes, sombras pesadas, bordas decorativas, texturas. Canvas: 1080x1080px. Cores: 60% branco | 30% #1a3a1a | 8% #00C853 | 2% #F9A825 (só conquista). Fonte: Nunito Black 900 números | ExtraBold 800 títulos | Bold 700 subtítulos | Regular 400 corpo. Ícones: flat design linha simples outline monocromático. SEM volume, SEM 3D, SEM sombra. Número slide: canto superior esquerdo, Nunito Black, #00C853, 48px. Logo iMoney: canto inferior direito, bússola flat + texto iMoney, 36px. Máximo 3 elementos por slide."

=== VÍDEO TikTok/Reels (45–60s) ===

ESTRUTURA OBRIGATÓRIA:
- Hook (0–2s): frase ou visual que para o scroll — impacto imediato, interrogação ou afirmação chocante
- Problema/Identificação (2–15s): mostrar a dor — público precisa se reconhecer na tela
- Virada/Solução (15–35s): apresentar a iMoney como o caminho — mostrar resultado concreto
- CTA único (35–45s): "Baixe grátis — link na bio" — NUNCA dois CTAs

DIRETRIZES:
- Hook sempre em primeira pessoa ou interrogação direta ao espectador
- Fechar caption nos 3 primeiros segundos com áudio trending
- Roteiro deve ser narrável em voz alta (sem jargão técnico)
- Closed caption visual para assistir sem som

=== HASHTAGS ===

Instagram (5 por post — misturar as categorias abaixo):
#financaspessoais #educacaofinanceira #dinheiro #sonhos #metas #independenciafinanceira #iMoney #appFinancas #fintech #Brasil #realizarsonhos #mepoupe

TikTok (4 por post):
#financastiktok #dinheiro #sonhos #metas #investir #appdeFinancas #IA #comoeconomizar #realizarsonhos #financaspessoais

LEGENDA INSTAGRAM: 150–200 caracteres com emojis + quebra + hashtags
LEGENDA TIKTOK: 100–150 caracteres + hashtags
`;

// ─── WEB SEARCH PARA TRENDING TOPICS ────────────────────────────────────────

async function getTrendingTopics(weekDate: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Hoje é ${weekDate}. Pesquise e identifique os 5 principais assuntos em alta no Brasil ESTA SEMANA relacionados a:
- Finanças pessoais (comportamento, dívidas, economia doméstica)
- Investimentos (Tesouro Direto, CDB, fundos, ações, cripto)
- Macroeconomia brasileira (SELIC atual, cotação do dólar hoje, Ibovespa desta semana, IPCA/inflação)
- Comportamento financeiro do brasileiro jovem (22–30 anos)
- Tendências fintech/tecnologia financeira no Brasil

Para cada tópico informe:
1. Título do assunto
2. Por que está em alta AGORA (cite dados concretos: taxa, valor, % desta semana)
3. Ângulo iMoney: como a iMoney pode usar esse assunto (qual pilar SEPC e que abordagem)

Seja específico com os números desta semana.`,
    },
  ];

  // @ts-expect-error: web_search_20250305 é uma ferramenta hospedada pela Anthropic
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages,
  });

  // Agentic loop — roda enquanto o modelo precisar usar ferramentas
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: toolUseBlocks.map((tu) => ({
        type: 'tool_result' as const,
        tool_use_id: tu.id,
        content: '',
      })),
    });
    // @ts-expect-error: mesma razão acima
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });
  }

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

// ─── GERAÇÃO DO CALENDÁRIO ───────────────────────────────────────────────────

interface Slide {
  numero: number;
  tipo: 'CAPA' | 'INTERNO' | 'CTA' | 'CONQUISTA' | 'TABELA';
  titulo: string;
  subtitulo?: string;
  icone_flat: string;
  prompt_claude_design: string;
}

interface CarrosselDay {
  dia: string;
  formato: 'carrossel';
  plataforma: string;
  horario: string;
  pilar: string;
  tema: string;
  titulo_carrossel: string;
  slides: Slide[];
  legenda: string;
  hashtags: string[];
}

interface VideoDay {
  dia: string;
  formato: 'video';
  plataforma: string;
  horario: string;
  pilar: string;
  tema: string;
  hook: string;
  problema: string;
  virada: string;
  cta: string;
  direcao_visual: string;
  legenda: string;
  hashtags: string[];
}

type CalendarDay = CarrosselDay | VideoDay;

interface CalendarData {
  semana: string;
  temas_em_alta: string[];
  dias: CalendarDay[];
}

async function generateCalendar(
  trends: string,
  weekDate: string
): Promise<CalendarData> {
  const systemPrompt = `Você é o Diretor de Conteúdo da iMoney. Gere o calendário editorial semanal completo, pronto para produção imediata.

${IMONEY_CONTEXT}

INSTRUÇÕES CRÍTICAS:
- Integre os assuntos em alta de forma natural e relevante para a persona Marina (26 anos, SP)
- Todo conteúdo deve estar alinhado ao tom de voz iMoney: aspiracional, humano, sem jargão bancário
- Os prompts Claude Design devem ser COMPLETOS (começar com o PROMPT-BASE obrigatório + especificações do slide)
- Os roteiros de vídeo devem ser narráveis em 45–60 segundos em voz alta
- Cada peça deve ter legenda completa com hashtags corretas para cada plataforma

RETORNE APENAS JSON VÁLIDO. Sem markdown, sem explicações, sem blocos de código.`;

  const userPrompt = `Semana de ${weekDate}

ASSUNTOS EM ALTA ESTA SEMANA:
${trends}

Gere um JSON com esta estrutura EXATA:

{
  "semana": "${weekDate}",
  "temas_em_alta": ["tema1", "tema2", "tema3"],
  "dias": [
    {
      "dia": "TERÇA-FEIRA",
      "formato": "carrossel",
      "plataforma": "Instagram",
      "horario": "19h–21h",
      "pilar": "E",
      "tema": "tema conectado ao trending",
      "titulo_carrossel": "título impactante que para o scroll",
      "slides": [
        {
          "numero": 1,
          "tipo": "CAPA",
          "titulo": "texto exato do título principal",
          "subtitulo": "texto do subtítulo se houver",
          "icone_flat": "descrição do ícone outline flat (ex: ícone de casa outline, traço 2px)",
          "prompt_claude_design": "SISTEMA DE DESIGN iMONEY — GUIA OFICIAL v3 2026. [resto do prompt-base completo]. SLIDE 1 — CAPA. Canvas 1080x1080px. Fundo: #1a3a1a. Título: '[titulo]' Nunito ExtraBold 800, cor branco #FFFFFF, 60px, centralizado. Subtítulo: '[subtitulo]' Nunito Bold 700, cor #00C853, 32px, abaixo do título. Ícone: [descrição flat outline]. Número '1': canto superior esquerdo, Nunito Black 900, #00C853, 48px. Logo iMoney bússola flat: canto inferior direito, 36px."
        },
        {
          "numero": 2,
          "tipo": "INTERNO",
          "titulo": "texto do ponto principal deste slide",
          "icone_flat": "ícone outline flat relevante",
          "prompt_claude_design": "SISTEMA DE DESIGN iMONEY — GUIA OFICIAL v3 2026. [prompt-base completo]. SLIDE 2. Canvas 1080x1080px. Fundo: #FFFFFF. Título: '[titulo]' Nunito ExtraBold 800, #1a3a1a, 54px, centralizado. Ícone: [descrição flat]. Número '2': canto superior esquerdo, Nunito Black 900, #00C853, 48px. Logo iMoney: canto inferior direito, 36px. Máximo 3 elementos."
        }
      ],
      "legenda": "texto completo da legenda com emojis (150–200 chars) + quebra de linha + hashtags",
      "hashtags": ["#financaspessoais", "#educacaofinanceira", "#dinheiro", "#sonhos", "#iMoney"]
    },
    {
      "dia": "QUARTA-FEIRA",
      "formato": "video",
      "plataforma": "TikTok/Reel",
      "horario": "Qualquer hora",
      "pilar": "P",
      "tema": "demo do app — funcionalidade em destaque",
      "hook": "frase exata dos primeiros 2 segundos (impacto máximo, interrogação ou afirmação)",
      "problema": "narração completa de 2–15s (identificação com a dor da persona)",
      "virada": "narração completa de 15–35s (como a iMoney resolve — mencionar funcionalidade específica)",
      "cta": "frase exata do CTA (ex: Baixa grátis agora — link na bio)",
      "direcao_visual": "descrição do que mostrar na tela durante cada parte do roteiro",
      "legenda": "texto da legenda tiktok (100–150 chars) + hashtags",
      "hashtags": ["#financastiktok", "#dinheiro", "#sonhos", "#iMoney"]
    },
    {
      "dia": "QUINTA-FEIRA",
      "formato": "carrossel",
      "plataforma": "Instagram",
      "horario": "19h–21h",
      "pilar": "C",
      "tema": "...",
      "titulo_carrossel": "...",
      "slides": [ /* mínimo 6 slides incluindo CAPA e CTA */ ],
      "legenda": "...",
      "hashtags": ["..."]
    },
    {
      "dia": "SEXTA-FEIRA",
      "formato": "video",
      "plataforma": "TikTok",
      "horario": "18h–20h",
      "pilar": "S",
      "tema": "viral — curiosidade ou provocação financeira",
      "hook": "...",
      "problema": "...",
      "virada": "...",
      "cta": "...",
      "direcao_visual": "...",
      "legenda": "...",
      "hashtags": ["..."]
    },
    {
      "dia": "DOMINGO",
      "formato": "video",
      "plataforma": "TikTok",
      "horario": "18h",
      "pilar": "E",
      "tema": "resumo da semana — SELIC, dólar, Ibovespa",
      "hook": "...",
      "problema": "...",
      "virada": "...",
      "cta": "...",
      "direcao_visual": "dados concretos da semana a mostrar na tela",
      "legenda": "...",
      "hashtags": ["..."]
    }
  ]
}

IMPORTANTE: Gere slides REAIS com conteúdo específico (mínimo 6 slides por carrossel). Os prompts Claude Design devem ser completos e incluir o PROMPT-BASE inteiro. Retorne APENAS o JSON.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // Remove possíveis blocos de código markdown
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  return JSON.parse(clean) as CalendarData;
}

// ─── CONSTRUÇÃO DO EMAIL HTML ────────────────────────────────────────────────

const PILAR_LABELS: Record<string, string> = {
  S: '🌟 Sonho',
  E: '📚 Educação',
  P: '📱 Produto',
  C: '🏆 Conquista',
};

const PILAR_COLORS: Record<string, string> = {
  S: '#7c3aed',
  E: '#0284c7',
  P: '#059669',
  C: '#d97706',
};

const SLIDE_TYPE_LABELS: Record<string, string> = {
  CAPA: '🎯 CAPA',
  INTERNO: '📄 Interno',
  CTA: '👆 CTA',
  CONQUISTA: '🏆 Conquista',
  TABELA: '📊 Tabela',
};

const SLIDE_TYPE_COLORS: Record<string, string> = {
  CAPA: '#1a3a1a',
  INTERNO: '#374151',
  CTA: '#00C853',
  CONQUISTA: '#F9A825',
  TABELA: '#0284c7',
};

function renderSlides(slides: Slide[]): string {
  return slides
    .map(
      (s) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 12px; overflow: hidden;">
      
      <!-- Slide header -->
      <div style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
        <span style="background: #00C853; color: white; font-size: 11px; font-weight: 900; padding: 2px 8px; border-radius: 100px; font-family: Arial, sans-serif;">
          ${s.numero}
        </span>
        <span style="font-size: 11px; font-weight: 700; color: ${SLIDE_TYPE_COLORS[s.tipo] || '#374151'}; font-family: Arial, sans-serif;">
          ${SLIDE_TYPE_LABELS[s.tipo] || s.tipo}
        </span>
        <span style="font-size: 12px; color: #555; font-style: italic; font-family: Arial, sans-serif;">
          ${s.icone_flat}
        </span>
      </div>
      
      <!-- Slide content -->
      <div style="padding: 12px 14px;">
        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #1a3a1a; font-family: Arial, sans-serif;">
          "${s.titulo}"
        </p>
        ${
          s.subtitulo
            ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #555; font-family: Arial, sans-serif;">${s.subtitulo}</p>`
            : '<div style="height: 10px;"></div>'
        }
        
        <!-- Claude Design Prompt -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px;">
          <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">
            🎨 Prompt Claude Design
          </p>
          <p style="margin: 0; font-size: 11px; color: #166534; line-height: 1.5; font-family: 'Courier New', monospace; white-space: pre-wrap; word-break: break-word;">
${escapeHtml(s.prompt_claude_design)}
          </p>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function renderVideoCard(day: VideoDay): string {
  const parts = [
    {
      label: 'HOOK',
      emoji: '⚡',
      time: '0–2s',
      color: '#dc2626',
      bg: '#fef2f2',
      content: day.hook,
    },
    {
      label: 'PROBLEMA',
      emoji: '😟',
      time: '2–15s',
      color: '#d97706',
      bg: '#fffbeb',
      content: day.problema,
    },
    {
      label: 'VIRADA',
      emoji: '✨',
      time: '15–35s',
      color: '#059669',
      bg: '#f0fdf4',
      content: day.virada,
    },
    {
      label: 'CTA',
      emoji: '👆',
      time: '35–45s',
      color: '#00C853',
      bg: '#f0fdf4',
      content: day.cta,
    },
  ];

  return `
    ${parts
      .map(
        (p) => `
      <div style="border-left: 3px solid ${p.color}; background: ${p.bg}; border-radius: 0 8px 8px 0; padding: 10px 14px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <span style="font-size: 14px;">${p.emoji}</span>
          <span style="font-size: 11px; font-weight: 700; color: ${p.color}; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">${p.label}</span>
          <span style="font-size: 10px; color: #9ca3af; font-family: Arial, sans-serif;">${p.time}</span>
        </div>
        <p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.5; font-family: Arial, sans-serif;">${escapeHtml(p.content)}</p>
      </div>
    `
      )
      .join('')}
    
    <!-- Direção visual -->
    <div style="background: #f3f4f6; border-radius: 8px; padding: 10px 14px; margin-top: 4px;">
      <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">🎬 Direção Visual</p>
      <p style="margin: 0; font-size: 12px; color: #374151; font-style: italic; font-family: Arial, sans-serif;">${escapeHtml(day.direcao_visual)}</p>
    </div>
  `;
}

function renderDayCard(day: CalendarDay, index: number): string {
  const pilarColor = PILAR_COLORS[day.pilar] || '#374151';
  const isCarrossel = day.formato === 'carrossel';
  const formatEmoji = isCarrossel ? '🖼️' : '🎬';
  const formatLabel = isCarrossel ? 'Carrossel' : 'Vídeo';

  const body = isCarrossel
    ? renderSlides((day as CarrosselDay).slides)
    : renderVideoCard(day as VideoDay);

  const caption = escapeHtml(day.legenda);
  const hashtags = day.hashtags.join(' ');

  return `
  <div style="background: white; border-radius: 14px; margin-bottom: 24px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    
    <!-- Day header -->
    <div style="background: #1a3a1a; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <p style="margin: 0 0 2px 0; color: #00C853; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">
          ${formatEmoji} ${formatLabel} · ${day.plataforma}
        </p>
        <h2 style="margin: 0; color: white; font-size: 20px; font-weight: 900; font-family: Arial, sans-serif;">
          ${day.dia}
        </h2>
      </div>
      <div style="text-align: right;">
        <div style="background: ${pilarColor}; color: white; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 100px; font-family: Arial, sans-serif; margin-bottom: 4px;">
          ${PILAR_LABELS[day.pilar] || day.pilar}
        </div>
        <p style="margin: 0; color: #a8c8a8; font-size: 11px; font-family: Arial, sans-serif;">🕐 ${day.horario}</p>
      </div>
    </div>

    <div style="padding: 18px 20px;">
      
      <!-- Tema -->
      <div style="background: #f0fdf4; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; border-left: 3px solid #00C853;">
        <p style="margin: 0 0 2px 0; font-size: 10px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">Tema da semana</p>
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a3a1a; font-family: Arial, sans-serif;">${escapeHtml(day.tema)}</p>
        ${isCarrossel ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #374151; font-family: Arial, sans-serif;"><strong>Título:</strong> "${escapeHtml((day as CarrosselDay).titulo_carrossel)}"</p>` : ''}
      </div>

      <!-- Main content: slides or video script -->
      ${body}

      <!-- Caption -->
      <div style="background: #f9fafb; border-radius: 8px; padding: 14px; margin-top: 16px; border: 1px dashed #d1d5db;">
        <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">📝 Legenda ${day.plataforma}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #1f2937; line-height: 1.5; font-family: Arial, sans-serif; white-space: pre-wrap;">${caption}</p>
        <p style="margin: 0; font-size: 12px; color: #00C853; font-family: Arial, sans-serif;">${escapeHtml(hashtags)}</p>
      </div>
      
    </div>
  </div>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHTML(data: CalendarData): string {
  const daysHTML = data.dias.map((d, i) => renderDayCard(d, i)).join('');

  const trendsHTML = data.temas_em_alta
    .map(
      (t) => `
    <li style="font-size: 13px; color: #374151; padding: 4px 0; font-family: Arial, sans-serif;">
      <span style="color: #00C853; font-weight: 700;">↗</span> ${escapeHtml(t)}
    </li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendário iMoney — ${escapeHtml(data.semana)}</title>
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 680px; margin: 0 auto; padding: 24px 16px;">

    <!-- HEADER -->
    <div style="background: #1a3a1a; border-radius: 16px; padding: 32px 28px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 36px; margin-bottom: 10px;">🧭</div>
      <h1 style="color: white; margin: 0 0 6px 0; font-size: 28px; font-weight: 900; font-family: Arial, sans-serif; letter-spacing: -0.5px;">
        Calendário iMoney
      </h1>
      <p style="color: #00C853; margin: 0 0 6px 0; font-size: 17px; font-weight: 700; font-family: Arial, sans-serif;">
        Semana de ${escapeHtml(data.semana)}
      </p>
      <p style="color: #7aab7a; margin: 0; font-size: 12px; font-family: Arial, sans-serif;">
        Gerado automaticamente toda segunda às 8h · Conteúdo atualizado com o que está em alta
      </p>
    </div>

    <!-- TRENDING BOX -->
    <div style="background: white; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #1a3a1a; font-family: Arial, sans-serif;">
        📈 Em alta esta semana — integrado ao calendário
      </p>
      <ul style="margin: 0; padding-left: 16px; list-style: none;">
        ${trendsHTML}
      </ul>
    </div>

    <!-- LEGEND -->
    <div style="background: white; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; border-left: 4px solid #00C853;">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">Pilares SEPC</p>
      <div style="font-size: 12px; color: #555; font-family: Arial, sans-serif; line-height: 1.8;">
        🌟 <strong>S = Sonho</strong> (30%) &nbsp;·&nbsp;
        📚 <strong>E = Educação</strong> (35%) &nbsp;·&nbsp;
        📱 <strong>P = Produto</strong> (20%) &nbsp;·&nbsp;
        🏆 <strong>C = Conquista</strong> (15%)
      </div>
    </div>

    <!-- DAYS -->
    ${daysHTML}

    <!-- FOOTER -->
    <div style="text-align: center; padding: 20px 0 8px 0;">
      <p style="color: #00C853; font-size: 14px; font-weight: 700; margin: 0 0 4px 0; font-family: Arial, sans-serif;">
        iMoney · imoney.ia.br
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0; font-style: italic; font-family: Arial, sans-serif;">
        "Seus sonhos têm um plano. A iMoney cuida dele."
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ─── HANDLER PRINCIPAL ───────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekDate = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const shortDate = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    console.log(`[calendario-semanal] Iniciando para a semana de ${weekDate}`);

    // 1. Busca assuntos em alta com web search
    console.log('[calendario-semanal] Buscando trending topics...');
    const trends = await getTrendingTopics(weekDate);

    // 2. Gera o calendário completo em JSON
    console.log('[calendario-semanal] Gerando calendário...');
    const calendarData = await generateCalendar(trends, weekDate);

    // 3. Monta o HTML do email
    const emailHTML = buildEmailHTML(calendarData);

    // 4. Envia via Resend
    console.log('[calendario-semanal] Enviando email...');
    const emailResult = await resend.emails.send({
      from: 'iMoney <gui@imoney.ia.br>',
      to: 'guiamdsilva1304@gmail.com',
      subject: `📅 Calendário iMoney — Semana de ${shortDate}`,
      html: emailHTML,
    });

    console.log('[calendario-semanal] Email enviado:', emailResult.data?.id);

    return NextResponse.json({
      ok: true,
      message: 'Calendário gerado e enviado com sucesso',
      email_id: emailResult.data?.id,
      week: weekDate,
      days_generated: calendarData.dias.length,
    });
  } catch (error) {
    console.error('[calendario-semanal] Erro:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Erro interno ao gerar calendário',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
