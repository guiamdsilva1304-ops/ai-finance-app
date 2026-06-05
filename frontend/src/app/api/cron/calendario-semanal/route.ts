import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Slide {
  numero: number
  tipo: string
  promptVisual: string
}

interface VideoScript {
  hook: string          // 0–1.5s — frase de abertura que para o scroll
  problema: string      // 1.5–8s — aprofunda a dor
  virada: string        // 8–20s — conteúdo / insight
  cta: string           // 20–30s — chamada com ancoragem de dor
  legendaPost: string
  hashtags: string[]
}

interface CarrosselScript {
  slides: Slide[]
  legendaPost: string
  hashtags: string[]
}

interface DiaPlan {
  diaSemana: string      // ex: "Terça-feira"
  data: string           // ex: "10/06"
  formato: 'carrossel' | 'video'
  pilar: string          // S / E / P / C
  tema: string
  hookScore: string      // por que esse tema para em 1.5s
  carrossel?: CarrosselScript
  video?: VideoScript
}

interface CalendarioSemanal {
  semana: string
  dias: DiaPlan[]
}

// ─── Gerador de calendário ────────────────────────────────────────────────────

async function gerarCalendario(trendingTopics: string): Promise<CalendarioSemanal> {

  const hoje = new Date()
  const proximaSegunda = new Date(hoje)
  proximaSegunda.setDate(hoje.getDate() + ((1 + 7 - hoje.getDay()) % 7 || 7))

  const dias = ['Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Domingo']
  const formatos: ('carrossel' | 'video')[] = ['carrossel', 'video', 'carrossel', 'video', 'video']

  const datas = dias.map((_, i) => {
    const d = new Date(proximaSegunda)
    d.setDate(proximaSegunda.getDate() + i + 1)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
  })

  const semanaLabel = `${datas[0]} a ${datas[4]}`

  const systemPrompt = `Você é o estrategista de conteúdo da iMoney — plataforma brasileira de finanças pessoais com IA.

SOBRE A iMONEY:
- Posicionamento: "A plataforma que conhece seus sonhos, constrói o plano e executa com você"
- Tagline: "Seus sonhos têm um plano. A iMoney cuida dele."
- Personas principal: Marina, 26 anos, analista de marketing em SP, R$3.800/mês, ansiosa com dinheiro mas sem disciplina para organizar
- Tom: humano, aspiracional, nunca frio nem bancário. Fala como amigo que entende de dinheiro.
- Pilares SEPC: S=Sonho (30%), E=Educação (35%), P=Produto (20%), C=Conquista (15%)
- Features REAIS disponíveis HOJE: Assessor IA (chat — 10 msgs/dia free, ilimitado Pro), Dashboard, Transações, Metas, Investimentos, Renda, Plano Pro R$29,90/mês
- NUNCA mencionar: Open Finance, crédito, investimento automático, integração bancária

IDENTIDADE VISUAL (carrosséis):
- Cores: Fundo escuro #1a3a1a | Verde vibrante #00C853 | Branco #FFFFFF
- Tipografia: Nunito (Black para títulos, Bold para subtítulos, Regular para corpo)
- Estilo: flat design, sem gradientes, sem clay 3D, sem mockups realistas
- Estrutura dos slides: número no canto superior esquerdo em #00C853, Nunito Black 48px
- Máximo 40 palavras por slide
- 6 slides por carrossel: Capa + 3 Conteúdo + Virada + CTA

REGRA DE OURO PARA HOOKS (primeiros 1.5 segundos):
O TikTok mata vídeos que não prendem em 2 segundos. O hook precisa:
1. Ser uma afirmação chocante OU uma pergunta que causa desconforto imediato
2. Falar de uma dor específica que Marina sente (não uma dor genérica)
3. Começar com a frase — sem logo, sem música, sem apresentação
4. Exemplos bons: "Você vai se aposentar com R$0 se continuar fazendo isso." / "Descobri que tava jogando R$400 por mês fora sem saber."
5. Exemplos ruins: "Hoje vou falar sobre finanças pessoais" / "Você sabia que economizar é importante?"

Responda APENAS com JSON válido, sem markdown, sem explicação.`

  const userPrompt = `Crie o calendário editorial da semana ${semanaLabel} para a iMoney.

TRENDING TOPICS DESTA SEMANA (use para criar ganchos culturais relevantes):
${trendingTopics}

DISTRIBUIÇÃO DE PILARES ESTA SEMANA:
- Terça (carrossel): Educação (E)
- Quarta (vídeo): Sonho (S)
- Quinta (carrossel): Produto (P) — mostrar feature real da plataforma em uso
- Sexta (vídeo): Educação (E)
- Domingo (vídeo): Conquista (C)

Para CADA DIA entregue:
- tema: o assunto específico (não genérico)
- hookScore: em 1 frase, por que esse tema para o scroll nos primeiros 1.5s
- Para CARROSSEL: 6 slides com promptVisual detalhado (especificação tipográfica + cores + layout exato para o Claude gerar a imagem) + legenda + hashtags
- Para VÍDEO: script completo com hook (0–1.5s), problema (1.5–8s), virada (8–20s), CTA com ancoragem de dor (20–30s) + legenda + hashtags

O hook do vídeo deve ser uma FRASE ÚNICA, chocante ou perturbadora, sem introdução.
O CTA deve sempre mencionar o problema específico do vídeo antes de chamar para a plataforma.

Formato exato do JSON:
{
  "semana": "${semanaLabel}",
  "dias": [
    {
      "diaSemana": "Terça-feira",
      "data": "${datas[0]}",
      "formato": "carrossel",
      "pilar": "E",
      "tema": "...",
      "hookScore": "...",
      "carrossel": {
        "slides": [
          { "numero": 1, "tipo": "CAPA", "promptVisual": "..." },
          { "numero": 2, "tipo": "CONTEÚDO", "promptVisual": "..." },
          { "numero": 3, "tipo": "CONTEÚDO", "promptVisual": "..." },
          { "numero": 4, "tipo": "CONTEÚDO", "promptVisual": "..." },
          { "numero": 5, "tipo": "VIRADA", "promptVisual": "..." },
          { "numero": 6, "tipo": "CTA", "promptVisual": "..." }
        ],
        "legendaPost": "...",
        "hashtags": ["imoney", "financaspessoais", "...]
      }
    },
    {
      "diaSemana": "Quarta-feira",
      "data": "${datas[1]}",
      "formato": "video",
      "pilar": "S",
      "tema": "...",
      "hookScore": "...",
      "video": {
        "hook": "...",
        "problema": "...",
        "virada": "...",
        "cta": "...",
        "legendaPost": "...",
        "hashtags": ["..."]
      }
    }
  ]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  const data = await response.json()
  const raw = data.content?.[0]?.text ?? ''
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as CalendarioSemanal
}

// ─── Busca trending topics ────────────────────────────────────────────────────

async function getTrendingTopics(): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Busque os trending topics no Brasil HOJE relacionados a: finanças pessoais, salário, emprego, consumo, Copa do Mundo 2026, cultura pop brasileira.
Liste os 6 mais relevantes como tópicos diretos, sem introdução. Formato: "1. [tópico] — [contexto em 1 frase]"`,
        }],
      }),
    })

    const data = await response.json()
    const texts = (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n')
    return texts || 'Sem trending disponível'
  } catch {
    return 'Copa do Mundo 2026, SELIC, inflação, primeiro emprego, salário mínimo, consumo consciente'
  }
}

// ─── Builder do HTML do email ─────────────────────────────────────────────────

const PILAR: Record<string, { label: string; bg: string; color: string }> = {
  S: { label: 'Sonho', bg: '#1a3a1a', color: '#00C853' },
  E: { label: 'Educação', bg: '#0d2b45', color: '#4FC3F7' },
  P: { label: 'Produto', bg: '#2d1a3a', color: '#CE93D8' },
  C: { label: 'Conquista', bg: '#3a1a1a', color: '#FF8A65' },
}

function renderSlides(slides: Slide[]): string {
  return slides.map(s => `
    <div style="margin-bottom:12px; padding:14px 16px; background:#f8f8f6; border-left:3px solid #00C853; border-radius:0 8px 8px 0;">
      <div style="font-size:11px; font-weight:700; color:#00C853; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px;">
        Slide ${s.numero} · ${s.tipo}
      </div>
      <div style="font-size:13px; color:#333; line-height:1.6; font-family: 'Courier New', monospace;">
        ${s.promptVisual}
      </div>
    </div>
  `).join('')
}

function renderVideoScript(v: VideoScript): string {
  const sections = [
    { label: '🔴 HOOK · 0–1.5s', content: v.hook, color: '#c0392b', bg: '#fdf2f2' },
    { label: '⚡ PROBLEMA · 1.5–8s', content: v.problema, color: '#e67e22', bg: '#fdf6ec' },
    { label: '💡 VIRADA · 8–20s', content: v.virada, color: '#2980b9', bg: '#f0f7fd' },
    { label: '📲 CTA · 20–30s', content: v.cta, color: '#27ae60', bg: '#f0faf4' },
  ]
  return sections.map(s => `
    <div style="margin-bottom:10px; padding:14px 16px; background:${s.bg}; border-left:3px solid ${s.color}; border-radius:0 8px 8px 0;">
      <div style="font-size:11px; font-weight:700; color:${s.color}; letter-spacing:0.08em; margin-bottom:6px;">${s.label}</div>
      <div style="font-size:14px; color:#222; line-height:1.7;">${s.content}</div>
    </div>
  `).join('')
}

function renderLegenda(legenda: string, hashtags: string[]): string {
  const tags = hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')
  return `
    <div style="margin-top:16px; padding:14px 16px; background:#f0faf4; border-radius:8px; border:1px solid #d4edda;">
      <div style="font-size:11px; font-weight:700; color:#27ae60; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">📝 Legenda pronta</div>
      <div style="font-size:13px; color:#333; line-height:1.7; margin-bottom:10px;">${legenda}</div>
      <div style="font-size:12px; color:#27ae60;">${tags}</div>
    </div>
  `
}

function renderDia(dia: DiaPlan): string {
  const pilar = PILAR[dia.pilar] ?? PILAR['E']
  const isCarrossel = dia.formato === 'carrossel'

  const conteudo = isCarrossel && dia.carrossel
    ? `
      <div style="font-size:12px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px;">
        📐 Prompts visuais — Claude Design
      </div>
      ${renderSlides(dia.carrossel.slides)}
      ${renderLegenda(dia.carrossel.legendaPost, dia.carrossel.hashtags)}
    `
    : dia.video
    ? `
      <div style="font-size:12px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px;">
        🎬 Roteiro completo
      </div>
      ${renderVideoScript(dia.video)}
      ${renderLegenda(dia.video.legendaPost, dia.video.hashtags)}
    `
    : ''

  return `
    <div style="margin-bottom:28px; border-radius:12px; overflow:hidden; border:1px solid #e8e8e8;">

      <!-- Cabeçalho do dia -->
      <div style="background:${pilar.bg}; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:12px; color:rgba(255,255,255,0.6); margin-bottom:2px;">${dia.data}</div>
          <div style="font-size:18px; font-weight:700; color:#fff;">${dia.diaSemana}</div>
        </div>
        <div style="text-align:right;">
          <div style="display:inline-block; padding:4px 10px; background:${pilar.color}22; border:1px solid ${pilar.color}55; border-radius:20px; font-size:11px; font-weight:700; color:${pilar.color}; margin-bottom:6px;">
            ${pilar.label}
          </div>
          <div style="font-size:11px; color:rgba(255,255,255,0.5);">
            ${isCarrossel ? '📐 Carrossel · Instagram' : '🎬 Vídeo · TikTok/Reels'}
          </div>
        </div>
      </div>

      <!-- Tema e hook score -->
      <div style="padding:16px 20px 0; background:#fff;">
        <div style="font-size:16px; font-weight:700; color:#1a1a1a; margin-bottom:8px;">${dia.tema}</div>
        <div style="padding:10px 14px; background:#fffbeb; border-left:3px solid #f59e0b; border-radius:0 8px 8px 0; margin-bottom:16px;">
          <span style="font-size:11px; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:0.06em;">Por que esse tema para o scroll: </span>
          <span style="font-size:13px; color:#78350f;">${dia.hookScore}</span>
        </div>
      </div>

      <!-- Conteúdo -->
      <div style="padding:0 20px 20px; background:#fff;">
        ${conteudo}
      </div>

    </div>
  `
}

function buildEmailHTML(calendario: CalendarioSemanal): string {
  const diasHTML = calendario.dias.map(renderDia).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Calendário iMoney — ${calendario.semana}</title>
</head>
<body style="margin:0; padding:0; background:#f4f5f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">

  <div style="max-width:640px; margin:0 auto; padding:24px 16px;">

    <!-- Header -->
    <div style="background:#1a3a1a; border-radius:12px; padding:28px 28px 24px; margin-bottom:24px; text-align:center;">
      <div style="display:inline-block; background:#00C853; color:#1a3a1a; font-size:11px; font-weight:800; letter-spacing:0.15em; text-transform:uppercase; padding:6px 14px; border-radius:20px; margin-bottom:16px;">
        Calendário Editorial
      </div>
      <div style="font-size:26px; font-weight:800; color:#ffffff; margin-bottom:6px;">
        iMoney · Semana ${calendario.semana}
      </div>
      <div style="font-size:14px; color:rgba(255,255,255,0.55);">
        5 posts prontos para publicar. Hook testado. Copy pronto.
      </div>
    </div>

    <!-- Legenda de pilares -->
    <div style="background:#fff; border-radius:10px; padding:14px 20px; margin-bottom:24px; border:1px solid #e8e8e8;">
      <div style="font-size:11px; font-weight:700; color:#999; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px;">Pilares da semana</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${Object.entries(PILAR).map(([k, v]) => `
          <span style="padding:4px 12px; background:${v.bg}; color:${v.color}; font-size:12px; font-weight:700; border-radius:20px;">
            ${k} · ${v.label}
          </span>
        `).join('')}
      </div>
    </div>

    <!-- Dias -->
    ${diasHTML}

    <!-- Footer -->
    <div style="text-align:center; padding:20px 0 8px;">
      <div style="font-size:12px; color:#999; margin-bottom:4px;">
        Gerado automaticamente toda segunda-feira · iMoney
      </div>
      <div style="font-size:11px; color:#bbb;">
        Seus sonhos têm um plano. A iMoney cuida dele.
      </div>
    </div>

  </div>

</body>
</html>`
}

// ─── Cron: gerar e salvar no Supabase (domingo 23h UTC) ──────────────────────

export async function GET(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? new URL(request.url).searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET && secret !== 'imoneycronsecret2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[calendario-semanal] Iniciando geração...')

    const trending = await getTrendingTopics()
    console.log('[calendario-semanal] Trending coletado.')

    const calendario = await gerarCalendario(trending)
    console.log('[calendario-semanal] Calendário gerado.')

    const { error } = await supabase
      .from('agent_memory')
      .upsert({
        key: 'calendario_semanal',
        value: { calendario, geradoEm: new Date().toISOString() },
        updated_by: 'cron-calendario-semanal',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

    if (error) throw error
    console.log('[calendario-semanal] Salvo no Supabase.')

    return NextResponse.json({ ok: true, semana: calendario.semana, dias: calendario.dias.length })
  } catch (err) {
    console.error('[calendario-semanal] Erro:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
