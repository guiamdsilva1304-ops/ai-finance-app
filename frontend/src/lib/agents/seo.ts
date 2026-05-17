import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

interface SeoOutput {
  research?: {
    topic: string
    keywords: string[]
    search_intents: string[]
    suggested_titles: string[]
  }
  article?: {
    titulo: string
    slug: string
    meta_description: string
    conteudo_markdown: string
    keywords: string[]
  }
}

export async function runSeoAgent(_mission: unknown): Promise<string> {
  // Fetch recent SEO research to avoid duplicate topics and enrich the prompt
  const { data: recentInsights } = await supabase
    .from('seo_insights')
    .select('topic, keywords, search_intents')
    .order('created_at', { ascending: false })
    .limit(10)

  const insightsContext = recentInsights?.length
    ? `\n\nPESQUISAS ANTERIORES (escolha tema diferente, incorpore keywords no artigo):\n` +
      recentInsights
        .map((i: { topic: string; keywords: string[]; search_intents: string[] }) =>
          `- ${i.topic}: keywords=[${(i.keywords as string[]).slice(0, 3).join(', ')}]`)
        .join('\n')
    : ''

  const prompt = `Você é o agente SEO da iMoney, fintech brasileira de finanças pessoais para jovens adultos.

Execute DUAS fases nesta ordem:

FASE 1 — PESQUISA INTERNA (não vai ao blog):
Escolha 1 tema de finanças pessoais para jovens brasileiros 18-35 anos que gere buscas reais.
Analise keywords de alto volume, intenção de busca e ângulos originais.${insightsContext}

FASE 2 — ARTIGO REAL (vai ao blog):
Escreva 1 artigo genuinamente útil (800-1200 palavras) usando a pesquisa.
- Tom: educativo, próximo, como um amigo que entende de finanças
- Estrutura: introdução envolvente > 3-4 seções H2 > conclusão com CTA suave para o iMoney
- Incorpore keywords naturalmente — NUNCA as liste explicitamente
- Use HTML simples: <h2>, <p>, <ul>, <li>, <strong>
- Exemplos com valores em R$ e contexto 100% brasileiro
- Mencione o iMoney naturalmente 1-2x

Retorne APENAS este JSON (sem texto antes/depois, sem blocos de código):
{"research":{"topic":"tema pesquisado","keywords":["kw1","kw2","kw3","kw4","kw5"],"search_intents":["intent1","intent2","intent3"],"suggested_titles":["título alternativo 1","título alternativo 2"]},"article":{"titulo":"Título para o leitor (60-70 chars)","slug":"titulo-em-kebab","meta_description":"Meta description 150-160 chars","conteudo_markdown":"conteúdo em HTML simples","keywords":["kw1","kw2","kw3"]}}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  let parsed: SeoOutput | null = null
  try {
    parsed = JSON.parse(raw) as SeoOutput
  } catch {
    const first = raw.indexOf('{')
    const last = raw.lastIndexOf('}')
    if (first !== -1 && last > first) {
      parsed = JSON.parse(raw.slice(first, last + 1)) as SeoOutput
    }
  }

  if (!parsed) throw new Error('Resposta inválida da IA — JSON não encontrado')

  const results: string[] = []

  // Save SEO research internally (never goes to the public blog)
  if (parsed.research?.topic) {
    const { error: resErr } = await supabase.from('seo_insights').insert({
      topic: parsed.research.topic,
      keywords: parsed.research.keywords ?? [],
      search_intents: parsed.research.search_intents ?? [],
      suggested_titles: parsed.research.suggested_titles ?? [],
      raw_data: JSON.stringify(parsed.research),
    })
    if (resErr) console.error('[seo agent] seo_insights insert error:', resErr.message)
    else results.push(`Pesquisa salva: "${parsed.research.topic}"`)
  }

  // Save reader article to blog_posts
  if (parsed.article?.titulo && parsed.article?.conteudo_markdown) {
    const { titulo, slug, meta_description, conteudo_markdown, keywords } = parsed.article
    const slugFinal = `${slug || titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`
    const palavras = conteudo_markdown.split(/\s+/).length
    const excerpt = conteudo_markdown.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200).trim() + '...'

    const { error } = await supabase.from('blog_posts').insert({
      slug: slugFinal,
      title: titulo,
      excerpt,
      content: conteudo_markdown,
      author: 'iMoney IA',
      category: 'educacao-financeira',
      tags: keywords ?? [],
      reading_time_min: Math.max(1, Math.ceil(palavras / 200)),
      published: true,
      published_at: new Date().toISOString(),
      seo_title: titulo,
      seo_description: meta_description ?? '',
      generated_by: 'agent:seo',
    })

    if (error) throw new Error(`Erro ao salvar artigo: ${error.message}`)
    results.push(`Artigo publicado: "${titulo}" | /blog/${slugFinal}`)
  }

  return results.join(' | ') || 'Nenhuma ação executada'
}
