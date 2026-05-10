import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  try {
    // Verifica quantos artigos foram publicados hoje
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hoje.toISOString())

    // Publica no máximo 1 artigo por dia
    if ((count ?? 0) >= 1) {
      return NextResponse.json({ msg: 'Artigo ja publicado hoje', count })
    }

    // Escolhe um tema baseado no dia da semana
    const diaSemana = new Date().getDay()
    const tema = TEMAS[diaSemana % TEMAS.length]

    console.log('[CRON SEO] Gerando artigo sobre:', tema)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: `Voce e o agente SEO da iMoney, app brasileiro de financas pessoais com IA para jovens de 20-30 anos. Hoje e ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.

Use web search para buscar noticias e dados atuais sobre o tema solicitado, depois escreva um artigo completo e otimizado para SEO.

Retorne APENAS JSON puro sem backticks:
{"artigo":{"titulo":"titulo otimizado para SEO","slug":"slug-em-kebab-case","meta_description":"descricao de 150 caracteres para SEO","conteudo":"artigo completo em markdown com pelo menos 1000 palavras, subtitulos H2 e H3, dados reais e conselhos praticos","publicar_automaticamente":true}}`,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
      messages: [{ role: 'user', content: `Escreva e publique um artigo completo sobre: ${tema}. Use dados atuais do Brasil em 2026. Conecte o tema com financas pessoais praticas para jovens brasileiros.` }],
    })

    const content = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')

    // Extrai e publica o artigo
    let json = null
    try {
      const blocoJson = content.match(/```json([\s\S]*?)```/)
      const jsonStr = blocoJson ? blocoJson[1].trim() : content
      const first = jsonStr.indexOf('{')
      const last = jsonStr.lastIndexOf('}')
      if (first !== -1 && last !== -1) json = JSON.parse(jsonStr.slice(first, last + 1))
    } catch { }

    if (json?.artigo) {
      const { titulo, slug, meta_description, conteudo } = json.artigo
      const palavras = conteudo.split(/\s+/).length
      const reading_time_min = Math.max(1, Math.ceil(palavras / 200))
      const excerpt = conteudo.replace(/#+\s/g, '').replace(/\*\*/g, '').slice(0, 200).trim() + '...'

      const { error } = await supabase.from('blog_posts').insert({
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

      if (error) throw error

      console.log('[CRON SEO] Publicado:', slug)
      return NextResponse.json({ sucesso: true, titulo, slug, palavras })
    }

    return NextResponse.json({ error: 'JSON nao extraido', content: content.slice(0, 200) }, { status: 500 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[CRON SEO]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
