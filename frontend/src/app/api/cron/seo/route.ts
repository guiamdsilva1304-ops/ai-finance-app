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

// === LEGACY PROMPT v1 — manter por 30 dias para rollback rápido ===
// const SYSTEM_PROMPT_V1 = `Voce e o agente SEO da iMoney, app brasileiro de financas pessoais com IA para jovens de 20-30 anos.
// Hoje e ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
// SELIC atual: 14,75% a.a. IPCA acumulado 2026: ~5,5%.
// Escreva um artigo completo em portugues brasileiro otimizado para SEO sobre o tema fornecido.
// Retorne APENAS o JSON: {"artigo":{"titulo":"...","slug":"...","meta_description":"...","conteudo":"..."}}`;

const SYSTEM_PROMPT_V2 = `Você é o redator SEO da iMoney (SaaS de finanças pessoais para brasileiros 20–35 anos).

PRODUTO: iMoney une metas de vida + gestão financeira + assessor IA. Preço: R$29,90/mês.
PERSONA: Marina, 26 anos, SP, R$4k/mês, quer organizar finanças mas odeia planilha.
TOM: próximo, encorajador, exemplos com R$, use "você". Nunca frio ou paternalista.
VOCABULÁRIO OK: sonho, meta, conquista, jornada. PROIBIDO: erro, falhou, culpa, jargão técnico.

PESQUISA: fornecida na mensagem do usuário. Use keyword_principal, coverage_gaps, financial_data, lsi_keywords. Não invente dados financeiros.

ARTIGO (600–700 palavras, markdown):
- H1 com keyword
- Intro: gancho emocional + o que vai aprender (3 linhas)
- 4 H2s — 1º H2 responde intenção em até 60 palavras (featured snippet)
- Após 2º H2: mid-CTA contextual. Ex: 💡 No iMoney, você define essa meta grátis. [Começar →](/login)
- 1 tabela ou lista numerada
- Conclusão: 3 bullets + CTA final
- 4 FAQs curtas (30–40 palavras cada)
- 2–3 internal links (anchor descritivo, nunca "clique aqui")

PROIBIDO: emoji em H1/H2/meta_title, "No mundo de hoje...", ativo específico, crypto, day-trade, promessa de retorno.

Retorne APENAS este JSON sem markdown fences:
{"decision":{"day_type":"","article_type":"","keyword_principal":"","intent":"","rationale":""},"competitor_analysis":{"top3_urls":[],"coverage_gaps":[],"our_differentiation":""},"article":{"h1":"","slug":"","meta_title":"","meta_description":"","og_image_alt":"","body_markdown":"","word_count":0,"internal_links":[{"anchor":"","slug":""}],"faq_schema":[{"question":"","answer":""}],"lsi_keywords_used":[]},"self_critique":{"intro_hook":"","specificity":"","engagement":"","cta_naturalness":"","beats_top3":"","unique_insight":""}}`

interface ArticleJSON {
  decision: {
    day_type: string
    article_type: string
    keyword_principal: string
    intent: string
    rationale: string
  }
  competitor_analysis: {
    top3_urls: string[]
    coverage_gaps: string[]
    our_differentiation: string
  }
  article: {
    h1: string
    slug: string
    meta_title: string
    meta_description: string
    og_image_alt: string
    body_markdown: string
    word_count: number
    internal_links: Array<{ anchor: string; slug: string }>
    faq_schema: Array<{ question: string; answer: string }>
    lsi_keywords_used: string[]
  }
  self_critique: {
    intro_hook: string
    specificity: string
    engagement: string
    cta_naturalness: string
    beats_top3: string
    unique_insight: string
  }
}

interface ResearchData {
  keyword_principal?: string
  day_type?: string
  article_type?: string
  intent?: string
  rationale?: string
  top3_urls?: string[]
  coverage_gaps?: string[]
  our_differentiation?: string
  financial_data?: { selic?: string; ipca_2026?: string; salario_minimo?: string }
  lsi_keywords?: string[]
}

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET ?? process.env.imoneycronsecret2026
  if (!cronSecret) return false
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true
  const { searchParams } = new URL(req.url)
  return searchParams.get('secret') === cronSecret
}

function extractFinalJson(content: Anthropic.Messages.ContentBlock[]): string {
  const texts = content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map(b => b.text)

  for (let i = texts.length - 1; i >= 0; i--) {
    const cleaned = texts[i].replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const first = cleaned.indexOf('{')
    if (first === -1) continue
    let depth = 0, last = -1
    for (let j = first; j < cleaned.length; j++) {
      if (cleaned[j] === '{') depth++
      else if (cleaned[j] === '}') { depth--; if (depth === 0) { last = j; break } }
    }
    if (last !== -1) {
      try { JSON.parse(cleaned.slice(first, last + 1)); return cleaned.slice(first, last + 1) } catch { continue }
    }
  }

  // Fallback: junta todos os blocos
  const combined = texts.join('\n').replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const first = combined.indexOf('{')
  if (first === -1) return ''
  let depth = 0, last = -1
  for (let i = first; i < combined.length; i++) {
    if (combined[i] === '{') depth++
    else if (combined[i] === '}') { depth--; if (depth === 0) { last = i; break } }
  }
  return last !== -1 ? combined.slice(first, last + 1) : ''
}

async function validateInternalLinks(
  links: Array<{ anchor: string; slug: string }>
): Promise<Array<{ anchor: string; slug: string }>> {
  if (!links?.length) return []
  const { data } = await supabase
    .from('blog_posts')
    .select('slug')
    .in('slug', links.map(l => l.slug))
    .eq('published', true)
  const valid = new Set((data ?? []).map((r: { slug: string }) => r.slug))
  const removed = links.filter(l => !valid.has(l.slug)).map(l => l.slug)
  if (removed.length) console.log('[SEO v2] Links removidos (slug inexistente):', removed.join(', '))
  return links.filter(l => valid.has(l.slug))
}

async function fetchResearch(): Promise<ResearchData | null> {
  // Tenta pesquisa de hoje primeiro
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const { data: todayData } = await supabase
    .from('seo_insights')
    .select('topic, raw_data')
    .gte('created_at', hoje.toISOString())
    .not('raw_data', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (todayData?.raw_data) {
    try {
      const parsed = JSON.parse(todayData.raw_data as string) as ResearchData
      if (parsed.keyword_principal) {
        console.log('[SEO v2] Pesquisa de hoje encontrada:', parsed.keyword_principal)
        return parsed
      }
    } catch { /* ignora */ }
  }

  // Fallback: pesquisa mais recente (qualquer data)
  const { data: latestData } = await supabase
    .from('seo_insights')
    .select('topic, raw_data')
    .not('raw_data', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)

  for (const row of latestData ?? []) {
    try {
      const parsed = JSON.parse(row.raw_data as string) as ResearchData
      if (parsed.keyword_principal) {
        console.log('[SEO v2] Usando pesquisa mais recente (fallback):', parsed.keyword_principal)
        return parsed
      }
    } catch { continue }
  }

  console.warn('[SEO v2] Nenhuma pesquisa encontrada no banco — artigo sem contexto de pesquisa')
  return null
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dryRun = searchParams.get('dry_run') === 'true'
  if (dryRun) console.log('[SEO v2] Modo dry_run — não insere no banco')

  try {
    if (!dryRun) {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hoje.toISOString())
        .eq('generated_by', 'cron-seo-v2')
      if ((count ?? 0) >= 1)
        return NextResponse.json({ msg: 'Artigo já publicado hoje', count })
    }

    // Busca pesquisa de keyword feita pelo cron seo-research
    const research = await fetchResearch()

    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
    const today = dayNames[new Date().getDay()]
    const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    console.log(`[SEO v2] Gerando artigo — dia: ${today} | keyword: ${research?.keyword_principal ?? 'sem pesquisa'}`)

    const researchContext = research
      ? `\n\n## PESQUISA JÁ REALIZADA — USE ESTES DADOS:\n${JSON.stringify(research, null, 2)}`
      : `\n\nNenhuma pesquisa prévia disponível. Escolha um tema relevante para jovens brasileiros e use dados financeiros conhecidos (SELIC ~14,75%, IPCA 2026 ~5,5%, salário mínimo R$1.518).`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT_V2,
      messages: [{
        role: 'user',
        content: `Hoje é ${dateStr} (${today}). Escreva o artigo de hoje seguindo as instruções.${researchContext}`,
      }],
    })

    const rawJson = extractFinalJson(response.content)
    if (!rawJson) {
      const preview = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map(b => b.text).join('').slice(0, 500)
      console.error('[SEO v2] JSON não extraído. Preview:', preview)
      return NextResponse.json({ error: 'JSON não extraído', preview }, { status: 500 })
    }

    let parsed: ArticleJSON
    try {
      parsed = JSON.parse(rawJson) as ArticleJSON
    } catch (e) {
      console.error('[SEO v2] JSON inválido:', e)
      return NextResponse.json({ error: 'JSON inválido', raw_preview: rawJson.slice(0, 300) }, { status: 500 })
    }

    console.log('[SEO v2] JSON OK:', {
      article_type: parsed.decision?.article_type,
      keyword: parsed.decision?.keyword_principal,
      word_count: parsed.article?.word_count,
      faq_count: parsed.article?.faq_schema?.length,
      links_count: parsed.article?.internal_links?.length,
    })

    const validatedLinks = await validateInternalLinks(parsed.article?.internal_links ?? [])
    console.log(`[SEO v2] Links válidos: ${validatedLinks.length}/${parsed.article?.internal_links?.length ?? 0}`)

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        research_used: research?.keyword_principal ?? null,
        validated_links: validatedLinks,
        parsed,
      })
    }

    const { h1, slug, meta_title, meta_description, og_image_alt, body_markdown, word_count, faq_schema, lsi_keywords_used } = parsed.article
    if (!h1 || !slug || !body_markdown)
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: h1, slug, body_markdown' }, { status: 500 })

    const slugFinal = `${slug}-${new Date().toISOString().slice(0, 10)}`
    const palavras = word_count || body_markdown.split(/\s+/).length
    const reading_time_min = Math.max(1, Math.ceil(palavras / 200))
    const excerpt = body_markdown.replace(/#+\s*/g, '').replace(/\*\*/g, '').replace(/\n+/g, ' ').slice(0, 200).trim() + '...'

    const { error: dbError } = await supabase.from('blog_posts').insert({
      title: h1,
      slug: slugFinal,
      excerpt,
      content: body_markdown,
      meta_title: meta_title ?? h1,
      meta_description: meta_description ?? '',
      seo_title: meta_title ?? h1,
      seo_description: meta_description ?? '',
      og_image_alt: og_image_alt ?? '',
      faq_schema: faq_schema ?? [],
      internal_links: validatedLinks,
      keyword_principal: parsed.decision?.keyword_principal ?? '',
      article_type: parsed.decision?.article_type ?? '',
      word_count: palavras,
      agent_critique: parsed.self_critique ?? {},
      agent_version: 'v2.0',
      author: 'Gui da iMoney',
      category: 'educacao-financeira',
      tags: lsi_keywords_used?.slice(0, 5) ?? [],
      reading_time_min,
      published: true,
      published_at: new Date().toISOString(),
      generated_by: 'cron-seo-v2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error('[SEO v2] Erro Supabase:', dbError.message)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    console.log('[SEO v2] Publicado:', slugFinal, '| palavras:', palavras)
    return NextResponse.json({
      sucesso: true,
      titulo: h1,
      slug: slugFinal,
      palavras,
      article_type: parsed.decision?.article_type,
      keyword: parsed.decision?.keyword_principal,
      research_used: research?.keyword_principal ?? null,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[SEO v2] Erro inesperado:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
