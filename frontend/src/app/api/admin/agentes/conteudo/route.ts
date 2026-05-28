import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ─── Pilares SEPC da iMoney ──────────────────────────────────────────────────

const PILARES = [
  { id: 'S', nome: 'Sonho', peso: 30, desc: 'Sonhos financeiros, visualização de metas, inspiração' },
  { id: 'E', nome: 'Educação', peso: 35, desc: 'Educação financeira prática, dicas, conceitos' },
  { id: 'P', nome: 'Produto', peso: 20, desc: 'Features da iMoney, como usar o app' },
  { id: 'C', nome: 'Conquista', peso: 15, desc: 'Histórias de sucesso, metas atingidas, celebrações' },
]

const FORMATOS = [
  { id: 'reels', label: 'Reels/TikTok', plataformas: ['instagram', 'tiktok'] },
  { id: 'carousel', label: 'Carrossel', plataformas: ['instagram'] },
]

// Selecionar pilar por peso
function selecionarPilar(): typeof PILARES[number] {
  const rand = Math.random() * 100
  let acumulado = 0
  for (const p of PILARES) {
    acumulado += p.peso
    if (rand <= acumulado) return p
  }
  return PILARES[1]
}

// ─── Gerar roteiro de Reels/TikTok ──────────────────────────────────────────

async function gerarReels(pilar: typeof PILARES[number], tendencias: string): Promise<object> {
  const prompt = `Você é o melhor criador de conteúdo financeiro do Brasil para TikTok e Instagram Reels.

Crie um roteiro completo para um Reels/TikTok da iMoney (app de finanças pessoais com IA para brasileiros de 20-35 anos).

PILAR: ${pilar.nome} (${pilar.desc})
TENDÊNCIAS ATUAIS: ${tendencias}
TOM: Amigo que entende de finanças, nunca bancário ou chato. Usa linguagem do dia a dia.
DURAÇÃO ALVO: 30-45 segundos

Retorne APENAS este JSON sem markdown:
{
  "tema": "tema principal em até 8 palavras",
  "angulo": "ângulo criativo específico",
  "hook": "primeira frase que para o scroll (max 10 palavras, impactante)",
  "roteiro": {
    "hook_0_3s": "o que acontece nos primeiros 3 segundos (texto na tela + ação)",
    "desenvolvimento_3_25s": "desenvolvimento principal com 3-4 pontos concisos",
    "cta_final_25_35s": "call to action para o app"
  },
  "caption": "legenda completa com gancho + valor + CTA + emojis (max 150 palavras)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "descricao_visual": "descrição detalhada do visual/cenário para gravar",
  "melhor_horario": "horário ideal para postar (ex: Terça 19h-21h)",
  "pilar": "${pilar.id}",
  "plataforma": "instagram,tiktok"
}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: 'Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.',
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('').trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON inválido do roteiro Reels')
  return JSON.parse(match[0])
}

// ─── Gerar carrossel ─────────────────────────────────────────────────────────

async function gerarCarrossel(pilar: typeof PILARES[number], tendencias: string): Promise<object> {
  const prompt = `Você é especialista em carrosséis virais de finanças pessoais no Instagram.

Crie um carrossel completo para a iMoney (app de finanças com IA para brasileiros de 20-35 anos).

PILAR: ${pilar.nome} (${pilar.desc})
TENDÊNCIAS ATUAIS: ${tendencias}
ESTILO VISUAL: fundo branco, verde iMoney #00C853, tipografia Nunito ExtraBold, icons clay 3D
REGRAS: máx 3 elementos por slide, sem gradientes, logo no canto inferior direito do último slide

Retorne APENAS este JSON sem markdown:
{
  "tema": "tema principal em até 8 palavras",
  "angulo": "ângulo criativo específico",
  "slides": [
    {
      "numero": 1,
      "tipo": "capa",
      "titulo": "título impactante da capa (max 6 palavras)",
      "subtitulo": "subtítulo opcional (max 8 palavras)",
      "cor_fundo": "#FFFFFF",
      "destaque": "elemento de destaque visual (emoji ou ícone)"
    },
    {
      "numero": 2,
      "tipo": "conteudo",
      "titulo": "título do slide",
      "corpo": "texto principal (max 20 palavras)",
      "destaque": "número, emoji ou dado impactante"
    }
  ],
  "caption": "legenda completa com gancho + valor + CTA (max 150 palavras)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6"],
  "cta_ultimo_slide": "texto do CTA no último slide",
  "melhor_horario": "horário ideal (ex: Quinta 19h-21h)",
  "pilar": "${pilar.id}",
  "slides_count": 7
}

Crie exatamente 7 slides: 1 capa + 5 conteúdo + 1 CTA final. Cada slide tem no máximo 3 elementos visuais.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: 'Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.',
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('').trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON inválido do carrossel')
  return JSON.parse(match[0])
}

// ─── Buscar tendências financeiras ───────────────────────────────────────────

async function buscarTendencias(): Promise<string> {
  try {
    // Usa o próprio Claude com web_search para pegar trends
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      tools: [{ type: 'web_search_20250305' as 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: 'Quais são os 5 principais assuntos de finanças pessoais em alta no Brasil agora? Lista rápida com números quando possível (ex: taxa SELIC atual, tendências de investimento, comportamento financeiro dos brasileiros). Seja conciso.',
      }],
    })
    return msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('').trim().slice(0, 500)
  } catch {
    return 'SELIC em 13,75%, inflação controlando, juros altos favorecendo renda fixa, brasileiros buscando reserva de emergência e primeiro investimento'
  }
}

// ─── Salvar no pipeline ───────────────────────────────────────────────────────

async function salvarNoPipeline(conteudo: Record<string, unknown>, tipo: 'reels' | 'carousel') {
  const plataformas = (conteudo.plataforma as string ?? 'instagram').split(',')
  const resultados = []

  for (const plataforma of plataformas) {
    const { error, data } = await supabase.from('content_pipeline').insert({
      platform: plataforma.trim(),
      content_type: tipo === 'reels' ? 'reels_script' : 'carousel',
      status: 'aguardando_aprovacao',
      tema: conteudo.tema,
      angulo: conteudo.angulo,
      caption: conteudo.caption,
      hashtags: conteudo.hashtags,
      cta: conteudo.cta_ultimo_slide ?? (conteudo.roteiro as Record<string,string>)?.cta_final_25_35s,
      melhor_horario: conteudo.melhor_horario,
      visual_description: tipo === 'reels'
        ? (conteudo.descricao_visual as string)
        : `Carrossel ${conteudo.slides_count ?? 7} slides`,
      slides: tipo === 'carousel' ? conteudo.slides : (conteudo.roteiro ?? null),
      slides_count: tipo === 'carousel' ? (conteudo.slides_count ?? 7) : null,
      generated_by: 'agente_conteudo',
      scheduled_for: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    }).select('id').single()

    if (!error && data) resultados.push({ id: data.id, plataforma: plataforma.trim() })
  }

  return resultados
}

// ─── GET — diagnóstico do pipeline ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = req.headers.get('x-admin-key')
  const cronAuth = req.headers.get('authorization')
  const sessionCookie = req.cookies.get('imoney_admin_session')?.value
  const SECRET = process.env.ADMIN_SESSION_SECRET || 'imoneyval1BI'
  const isAdmin = auth === SECRET || sessionCookie === SECRET
  const isCron = cronAuth === `Bearer ${process.env.CRON_SECRET}`
  if (!isAdmin && !isCron) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pipeline } = await supabase
    .from('content_pipeline')
    .select('platform, content_type, status, tema, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  const { count: pendentes } = await supabase
    .from('content_pipeline')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'aguardando_aprovacao')

  const { count: aprovados } = await supabase
    .from('content_pipeline')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'aprovado')

  return NextResponse.json({
    resumo: { pendentes: pendentes ?? 0, aprovados: aprovados ?? 0 },
    pipeline: pipeline ?? [],
  })
}

// ─── POST — gerar conteúdo ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-key')
  const cronAuth = req.headers.get('authorization')
  const sessionCookie = req.cookies.get('imoney_admin_session')?.value
  const SECRET = process.env.ADMIN_SESSION_SECRET || 'imoneyval1BI'
  const isAdmin = auth === SECRET || sessionCookie === SECRET
  const isCron = cronAuth === `Bearer ${process.env.CRON_SECRET}`
  if (!isAdmin && !isCron) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const acao = body.acao ?? 'semana_completa'
  // acao: 'reels' | 'carousel' | 'semana_completa'

  const tendencias = await buscarTendencias()
  const gerados = []
  const erros = []

  try {
    if (acao === 'reels' || acao === 'semana_completa') {
      // Gerar 2 Reels com pilares diferentes
      for (let i = 0; i < 2; i++) {
        try {
          const pilar = selecionarPilar()
          const conteudo = await gerarReels(pilar, tendencias) as Record<string, unknown>
          const salvos = await salvarNoPipeline(conteudo, 'reels')
          gerados.push({ tipo: 'reels', pilar: pilar.nome, tema: conteudo.tema, salvos })
          await new Promise(r => setTimeout(r, 1000))
        } catch (e) {
          erros.push({ tipo: 'reels', erro: e instanceof Error ? e.message : String(e) })
        }
      }
    }

    if (acao === 'carousel' || acao === 'semana_completa') {
      // Gerar 1 carrossel
      try {
        const pilar = selecionarPilar()
        const conteudo = await gerarCarrossel(pilar, tendencias) as Record<string, unknown>
        const salvos = await salvarNoPipeline(conteudo, 'carousel')
        gerados.push({ tipo: 'carousel', pilar: pilar.nome, tema: conteudo.tema, salvos })
      } catch (e) {
        erros.push({ tipo: 'carousel', erro: e instanceof Error ? e.message : String(e) })
      }
    }

  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    gerados: gerados.length,
    pendentes_aprovacao: gerados.length,
    tendencias_usadas: tendencias.slice(0, 100),
    detalhes: gerados,
    erros: erros.length > 0 ? erros : undefined,
  })
}
