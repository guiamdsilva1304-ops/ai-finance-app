import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEMAS = [
  'como montar reserva de emergencia em 2026',
  'tesouro selic vs CDB qual escolher 2026',
  'como sair das dividas com salario minimo',
  'investimentos para iniciantes 2026',
  'como economizar dinheiro no dia a dia',
  'FGTS vale a pena sacar',
  'previdencia privada ou tesouro direto',
  'como declarar imposto de renda 2026',
  'cartao de credito como usar sem se endividar',
  'renda extra ideias praticas 2026',
]

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET ?? process.env.imoneycronsecret2026
  if (!cronSecret) return false
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true
  const { searchParams } = new URL(req.url)
  return searchParams.get('secret') === cronSecret
}

function extrairJson(text: string): Record<string, unknown> | null {
  // Remove backtick code blocks if present
  const semBackticks = text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim()
  const tentativas = [semBackticks, text]
  for (const str of tentativas) {
    try {
      const first = str.indexOf('{')
      const last = str.lastIndexOf('}')
      if (first !== -1 && last !== -1) {
        return JSON.parse(str.slice(first, last + 1))
      }
    } catch { /* continua */ }
  }
  return null
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  try {
    // Verifica se já publicou hoje
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hoje.toISOString())
      .eq('generated_by', 'cron-seo')

    if ((count ?? 0) >= 1) {
      return NextResponse.json({ msg: 'Artigo ja publicado hoje', count })
    }

    // Tema baseado no dia; sufixo de data no slug para nunca colidir
    const diaSemana = new Date().getDay()
    const tema = TEMAS[diaSemana % TEMAS.length]
    const slugSuffix = new Date().toISOString().slice(0, 10) // ex: 2026-05-12

    console.log('[CRON SEO] Gerando artigo sobre:', tema)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `Voce e o agente SEO da iMoney, app brasileiro de financas pessoais com IA para jovens de 20-30 anos.
Hoje e ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
SELIC atual: 14,75% a.a. IPCA acumulado 2026: ~5,5%.

Escreva um artigo completo em portugues brasileiro otimizado para SEO sobre o tema fornecido.
Use dados reais do Brasil em 2026, exemplos concretos com valores em reais, e linguagem proxima de jovens de 20-30 anos.

Retorne APENAS o JSON a seguir — sem texto antes ou depois, sem backticks, sem markdown extra:
{"artigo":{"titulo":"titulo otimizado para SEO (60-70 chars)","slug":"slug-kebab-case-${slugSuffix}","meta_description":"descricao de 140-155 caracteres para Google","conteudo":"artigo completo em markdown com minimo 900 palavras, subtitulos H2 e H3, dados numericos reais, exemplos praticos e call-to-action"}}`,
      messages: [{
        role: 'user',
        content: `Escreva o artigo completo sobre: ${tema}. Foque em dicas praticas e dados reais para jovens brasileiros em 2026.`,
      }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')

    if (!rawText) {
      console.error('[CRON SEO] Resposta vazia do modelo')
      return NextResponse.json({ error: 'Resposta vazia do modelo' }, { status: 500 })
    }

    const json = extrairJson(rawText)

    if (!json?.artigo) {
      console.error('[CRON SEO] JSON nao extraido. Preview:', rawText.slice(0, 300))
      return NextResponse.json({ error: 'JSON nao extraido', preview: rawText.slice(0, 200) }, { status: 500 })
    }

    const { titulo, slug, meta_description, conteudo } = json.artigo as Record<string, string>

    if (!titulo || !slug || !conteudo) {
      console.error('[CRON SEO] Campos obrigatorios ausentes no JSON')
      return NextResponse.json({ error: 'Campos ausentes no JSON' }, { status: 500 })
    }

    const palavras = conteudo.split(/\s+/).length
    const reading_time_min = Math.max(1, Math.ceil(palavras / 200))
    const excerpt = conteudo.replace(/#+\s*/g, '').replace(/\*\*/g, '').slice(0, 200).trim() + '...'

    const { error: dbError } = await supabase.from('blog_posts').insert({
      title: titulo,
      slug,
      excerpt,
      content: conteudo,
      seo_title: titulo,
      seo_description: meta_description ?? '',
      author: 'Gui da iMoney',
      category: 'educacao-financeira',
      tags: [],
      reading_time_min,
      published: true,
      published_at: new Date().toISOString(),
      generated_by: 'cron-seo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error('[CRON SEO] Erro Supabase:', dbError.message, '| Slug tentado:', slug)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    console.log('[CRON SEO] Publicado com sucesso:', slug, '| Palavras:', palavras)
    return NextResponse.json({ sucesso: true, titulo, slug, palavras })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[CRON SEO] Erro inesperado:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
