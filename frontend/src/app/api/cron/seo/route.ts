import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ArticleJSON {
  h1: string
  slug: string
  meta_title: string
  meta_description: string
  og_image_alt: string
  article_type: string
  word_count: number
  faq_schema: Array<{ question: string; answer: string }>
  lsi_keywords_used: string[]
  internal_links?: Array<{ anchor: string; slug: string }>
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

// Mapeamento de dia da semana para tipo de artigo
const DAY_TYPE_MAP: Record<number, { type: string; format: string; instruction: string }> = {
  1: {
    type: 'educacional',
    format: 'Como fazer X em Y passos',
    instruction: 'Artigo educacional profundo com passo a passo numerado detalhado. Cada passo deve ter ao menos 2 parágrafos explicando o "como" e o "por quê". Inclua exemplos concretos com valores em R$.',
  },
  3: {
    type: 'comparativo',
    format: 'Comparativo ou lista ranked',
    instruction: 'Artigo comparativo ou lista com rankings claros. Inclua obrigatoriamente 1 tabela markdown comparando as opções (colunas: opção, vantagem, desvantagem, para quem serve). Seja específico nos critérios de comparação.',
  },
  5: {
    type: 'problema_solucao',
    format: 'Problema + solução prática',
    instruction: 'Comece identificando o problema real com empatia (o leitor deve se reconhecer). Explique as causas raiz com profundidade. Ofereça solução prática em etapas claras. Termine com um plano de 30 dias.',
  },
}

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET ?? process.env.imoneycronsecret2026
  if (!cronSecret) return false
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true
  const { searchParams } = new URL(req.url)
  return searchParams.get('secret') === cronSecret
}

function extractJson(text: string): string {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  if (start === -1) return ''
  let depth = 0, inString = false, escaped = false
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        const candidate = cleaned.slice(start, i + 1)
        try { JSON.parse(candidate); return candidate } catch { return '' }
      }
    }
  }
  return ''
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
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
  return links.filter(l => valid.has(l.slug))
}

async function fetchResearch(): Promise<ResearchData | null> {
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
      if (parsed.keyword_principal) return parsed
    } catch { /* ignora */ }
  }

  const { data: latestData } = await supabase
    .from('seo_insights')
    .select('topic, raw_data')
    .not('raw_data', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)

  for (const row of latestData ?? []) {
    try {
      const parsed = JSON.parse(row.raw_data as string) as ResearchData
      if (parsed.keyword_principal) return parsed
    } catch { continue }
  }

  return null
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dryRun = searchParams.get('dry_run') === 'true'

  try {
    // ── Tipo de artigo do dia ────────────────────────────────────────────────
    const dayOfWeek = new Date().getDay() // 0=Dom,1=Seg,2=Ter,3=Qua,4=Qui,5=Sex,6=Sáb
    const dayType = DAY_TYPE_MAP[dayOfWeek] ?? DAY_TYPE_MAP[1]

    // ── Guarda 1: já publicou hoje? ──────────────────────────────────────────
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

    // ── Pesquisa ─────────────────────────────────────────────────────────────
    const research = await fetchResearch()

    // ── Guarda 2: keyword já usada nos últimos 7 dias? ───────────────────────
    if (!dryRun && research?.keyword_principal) {
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
      const { count: kwCount } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', seteDiasAtras.toISOString())
        .eq('keyword_principal', research.keyword_principal)
      if ((kwCount ?? 0) >= 1)
        return NextResponse.json({ msg: 'Keyword já publicada recentemente', keyword: research.keyword_principal, skipped: true })
    }

    const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const researchContext = research
      ? `keyword="${research.keyword_principal}" | tipo=${research.article_type ?? 'informacional'} | intent=${research.intent ?? 'informacional'} | gaps=${JSON.stringify(research.coverage_gaps ?? [])} | diferencial="${research.our_differentiation ?? ''}" | lsi=${JSON.stringify(research.lsi_keywords ?? [])} | dados=${JSON.stringify(research.financial_data ?? {})}`
      : `Sem pesquisa. Use tema relevante para jovens brasileiros. Dados: SELIC 14,75%, IPCA ~5,5%, salário mínimo R$1.518.`

    // ── CHAMADA 1: apenas metadados + estrutura (sem body) ───────────────────
    console.log('[SEO v2] Chamada 1: metadados... | dia:', dayType.type)
    const resp1 = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `Você é o estrategista SEO da iMoney (SaaS finanças pessoais, Brasil, 20–35 anos).
PRODUTO: iMoney une metas de vida + gestão financeira + assessor IA. Preço R$29,90/mês.
PERSONA: Marina, 26 anos, SP, R$4k/mês.
TIPO DE ARTIGO DO DIA: ${dayType.type} — ${dayType.format}
TOM: próximo, encorajador, use "você". PROIBIDO: crypto, day-trade, promessa de retorno.

Retorne APENAS este JSON minificado, sem texto antes/depois, sem indentação:
{"h1":"","slug":"","meta_title":"","meta_description":"","og_image_alt":"","article_type":"","faq_schema":[{"question":"","answer":""}],"lsi_keywords_used":[]}

Regras:
- slug: kebab-case, sem data, max 6 palavras
- meta_description: 140–160 chars, inclui keyword principal
- faq_schema: 5 perguntas longtail, respostas de 30–40 palavras cada (relevantes para featured snippet)
- lsi_keywords_used: 8 termos relacionados e variações semânticas
- article_type: use exatamente "${dayType.type}"`,
      messages: [{
        role: 'user',
        content: `Hoje é ${dateStr}. Pesquisa: ${researchContext}`,
      }],
    })

    const text1 = extractText(resp1.content)
    const rawMeta = extractJson(text1)
    if (!rawMeta) {
      console.error('[SEO v2] Chamada 1 falhou. Preview:', text1.slice(0, 300))
      return NextResponse.json({ error: 'Metadados não extraídos', preview: text1.slice(0, 300) }, { status: 500 })
    }

    const meta = JSON.parse(rawMeta) as ArticleJSON
    console.log('[SEO v2] Metadados OK:', meta.h1)

    // ── CHAMADA 2: body completo (1200–1500 palavras) ─────────────────────────
    console.log('[SEO v2] Chamada 2: body profundo...')
    const resp2 = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `Você é o redator SEO sênior da iMoney (SaaS finanças pessoais, Brasil, 20–35 anos).
PRODUTO: iMoney une metas de vida + gestão financeira + assessor IA. Preço R$29,90/mês.
PERSONA: Marina, 26 anos, SP, R$4k/mês, quer organizar finanças mas odeia planilha.
TOM: próximo, encorajador, exemplos com R$, use "você". Nunca frio ou paternalista.
VOCABULÁRIO OK: sonho, meta, conquista, jornada, plano. PROIBIDO: erro, falhou, culpa, jargão técnico, crypto, day-trade, promessa de retorno.

TIPO DE ARTIGO: ${dayType.format}
INSTRUÇÃO ESPECÍFICA: ${dayType.instruction}

Escreva o artigo em markdown com 1.200–1.500 palavras. Estrutura obrigatória:
- NÃO inclua o H1 no body — comece direto pelo parágrafo de intro
- Intro (2–3 linhas): gancho emocional + promessa do artigo
- Mínimo 5 H2s bem desenvolvidos, cada um com 2–3 parágrafos sólidos
- Pelo menos 2 H3s dentro dos H2s para sub-tópicos relevantes
- 1º H2: responde a intenção principal de forma direta e completa (featured snippet, 50–80 palavras)
- Após o 2º H2: mid-CTA integrado naturalmente ao texto. Ex: "No iMoney, você já consegue configurar essa meta em menos de 5 minutos. [Começar grátis →](/login)"
- 1 lista numerada com 5–6 itens (cada item com 1–2 frases de explicação)
- 1 lista com bullets para complementar um dos H2s
- Use pelo menos 1 dado concreto (SELIC, IPCA, salário mínimo) com contexto explicativo
- Inclua pelo menos 1 exemplo prático com valores em R$ (ex: "Se você ganha R$3.500 e separa 20%...")
- Conclusão: 3 bullets de resumo dos pontos principais + CTA final. Ex: "[Começar grátis no iMoney →](/login)"
- Se artigo comparativo: inclua 1 tabela markdown com mínimo 3 colunas
- Se artigo de passo a passo: a lista numerada principal deve ser o coração do artigo

Retorne APENAS o markdown puro, sem blocos de código, sem JSON, sem emoji em títulos, sem comentários.`,
      messages: [{
        role: 'user',
        content: `H1: ${meta.h1}\nPesquisa: ${researchContext}`,
      }],
    })

    const body_markdown = extractText(resp2.content).trim()
    if (!body_markdown || body_markdown.length < 500) {
      console.error('[SEO v2] Chamada 2 falhou. Preview:', body_markdown.slice(0, 200))
      return NextResponse.json({ error: 'Body não gerado', preview: body_markdown.slice(0, 200) }, { status: 500 })
    }
    console.log('[SEO v2] Body OK:', body_markdown.length, 'chars')

    const validatedLinks = await validateInternalLinks(meta.internal_links ?? [])

    if (dryRun) {
      return NextResponse.json({ ok: true, dry_run: true, day_type: dayType.type, meta, body_preview: body_markdown.slice(0, 500) })
    }

    // ── Inserção no banco ────────────────────────────────────────────────────
    if (!meta.h1 || !meta.slug || !body_markdown)
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 500 })

    const slugFinal = `${meta.slug}-${new Date().toISOString().slice(0, 10)}`
    const palavras = body_markdown.split(/\s+/).length
    const reading_time_min = Math.max(1, Math.ceil(palavras / 200))
    const excerpt = (
      body_markdown
        .split('\n')
        .map(l => l.trim())
        .find(l => l.length > 40 && !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('>'))
        ?? body_markdown.slice(0, 320)
    )
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 320)
      .trim() + '...'

    const { error: dbError } = await supabase.from('blog_posts').insert({
      title: meta.h1,
      slug: slugFinal,
      excerpt,
      content: body_markdown,
      meta_title: meta.meta_title ?? meta.h1,
      meta_description: meta.meta_description ?? '',
      seo_title: meta.meta_title ?? meta.h1,
      seo_description: meta.meta_description ?? '',
      og_image_alt: meta.og_image_alt ?? '',
      faq_schema: meta.faq_schema ?? [],
      internal_links: validatedLinks,
      keyword_principal: research?.keyword_principal ?? '',
      article_type: dayType.type,
      word_count: palavras,
      agent_version: 'v2.2',
      author: 'Gui da iMoney',
      category: 'educacao-financeira',
      tags: meta.lsi_keywords_used?.slice(0, 8) ?? [],
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

    console.log('[SEO v2] Publicado:', slugFinal, '| palavras:', palavras, '| tipo:', dayType.type)
    return NextResponse.json({
      sucesso: true,
      titulo: meta.h1,
      slug: slugFinal,
      palavras,
      article_type: dayType.type,
      reading_time_min,
      keyword: research?.keyword_principal ?? null,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[SEO v2] Erro inesperado:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
