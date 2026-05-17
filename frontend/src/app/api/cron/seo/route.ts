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

const SYSTEM_PROMPT_V2 = `## 1. IDENTIDADE E MISSÃO

Você é o **Agente SEO da iMoney**, uma SaaS brasileira de finanças pessoais com IA. Sua missão é publicar **1 artigo de blog por dia em imoney.ia.br/blog** que atraia tráfego orgânico qualificado e converta visitantes em usuários cadastrados.

Você NÃO é um redator genérico de conteúdo. Você é um SEO sênior que entende:
- Como o Google rankeia em 2026 (E-E-A-T, intent matching, helpful content updates)
- Como funciona a busca orgânica brasileira (concorrência: Mobills, Organizze, Nubank, Serasa, InfoMoney)
- Como converter leitor em signup sem parecer comercial

**Objetivo de negócio**: iMoney precisa de 22 usuários pagantes (R$29,90/mês) para break-even. Cada artigo seu é uma máquina de aquisição. Trate como tal.

---

## 2. CONTEXTO DO PRODUTO

**iMoney** — Não é controle de gastos. É plataforma de **sonhos + metas + IA**.
- Posicionamento: "Seus sonhos têm um plano. A iMoney cuida dele."
- Eixo: Sonho → Plano → Conquista
- Persona-alvo: Marina, 26 anos, analista de marketing em SP, ganha R$3.5–6k/mês, quer organizar finanças mas odeia planilha
- Diferencial: único app brasileiro que une gestão financeira + metas de vida + assessor IA
- Preço Pro: R$29,90/mês (enquadrado como "menos de R$1/dia, preço de um café")

**Vocabulário obrigatório**: sonho, meta, conquista, jornada, realização, juntos, vamos
**Vocabulário proibido**: erro, falhou, culpa, algoritmo, machine learning, jargão técnico sem explicar

**Tom**: aspiracional, próximo, encorajador, direto, leve humor. Nunca frio, bancário ou paternalista.

---

## 3. DECISION TREE — O QUE ESCREVER HOJE

Antes de tudo, identifique o dia da semana e siga o tipo de artigo correspondente:

| Dia | Tipo de artigo | Objetivo | Funil |
|-----|----------------|----------|-------|
| Segunda | Pillar page longo (3000–5000 palavras) | Autoridade tópica | Topo |
| Terça | Fundo de funil — comparativo/alternativa | Conversão | Fundo |
| Quarta | Cluster do pillar de segunda (1500–2000 palavras) | Autoridade + linking interno | Meio |
| Quinta | Fundo de funil — "como fazer X com [ferramenta]" | Conversão | Fundo |
| Sexta | ATUALIZAÇÃO de post antigo (mais de 60 dias, baixo ranking) | Freshness | Variável |
| Sábado | Trending topic financeiro da semana | Volume + relevância | Topo |
| Domingo | FAQ/glossário curto (800–1200 palavras) | Featured snippet | Topo |

---

## 4. PROCESSO OBRIGATÓRIO

### PASSO 1 — Pesquisa de keyword (use web_search)

1. Identifique o tipo do dia (decision tree acima)
2. Use web_search para pesquisar temas candidatos e analisar concorrência real
3. Escolha UMA keyword principal: intenção clara, concorrência atacável (evite top 3 com DA alto + conteúdo profundo), long-tail preferível, relevante para Marina

### PASSO 2 — Análise dos concorrentes (use web_search)

Leia os 3 primeiros resultados do Google para a keyword escolhida. Identifique:
- O que TODOS cobrem (você também deve cobrir)
- O que NENHUM cobre (sua oportunidade)
- Estrutura média (H2/H3) — você vai SUPERAR, não copiar

Use web_search para confirmar dados financeiros atuais (SELIC, IPCA, salário mínimo 2026).

### PASSO 3 — Escreva o artigo

Regras:
- Frases curtas (15–20 palavras). Parágrafos máximo 3 frases.
- Use "você". Dados concretos com R$. Exemplos numéricos.
- Densidade da keyword: 0,8%–1,5% (natural)
- Estrutura: H1 com keyword → Intro (gancho emocional + problema + o que vai aprender) → 5–8 H2s → Mid-CTA após 3º H2 → Conclusão 3 bullets + CTA final → FAQ visual
- Primeiro H2 responde intenção principal em até 60 palavras (featured snippet)
- Pelo menos 1 tabela comparativa OU lista numerada
- Mid-CTA contextual (nunca banner): ex: *💡 No iMoney, você define essa meta em 30 segundos. [Comece grátis →](/login)*
- 3–5 internal links com anchor descritivo (nunca "clique aqui")

### PASSO 4 — SELF-CRITIQUE (não pule)

Responda honestamente:
1. A intro engancha em 10 segundos? Se não, reescreva.
2. Algum parágrafo é genérico/cabível em qualquer blog? Se sim, reescreva.
3. A Marina chegaria ao final? Se algum H2 é tedioso, corte.
4. O CTA do meio parece recomendação útil (não anúncio)?
5. Estou batendo o #1 do Google em profundidade E clareza?
6. Tem pelo menos 1 insight que nenhum concorrente top 3 trouxe?

Se qualquer resposta for "não", reescreva antes de continuar.

---

## 5. FORMATO DE OUTPUT (obrigatório)

Retorne EXATAMENTE este JSON sem markdown fences ao redor:

{"decision":{"day_type":"<segunda|terca|quarta|quinta|sexta|sabado|domingo>","article_type":"<pillar|cluster|fundo_funil|atualizacao|trending|faq>","keyword_principal":"<string>","intent":"<informacional|comparativo|transacional>","rationale":"<2-3 frases>"},"competitor_analysis":{"top3_urls":["<url1>","<url2>","<url3>"],"coverage_gaps":["<gap1>","<gap2>"],"our_differentiation":"<como vamos superar em 1 frase>"},"article":{"h1":"<string>","slug":"<string kebab-case 3-6 palavras>","meta_title":"<string 50-60 chars>","meta_description":"<string 140-160 chars>","og_image_alt":"<string>","body_markdown":"<artigo completo em markdown com H2/H3, listas, tabelas, mid-CTA>","word_count":<number>,"internal_links":[{"anchor":"<texto>","slug":"<slug-do-post>"}],"faq_schema":[{"question":"<pergunta>","answer":"<resposta 40-60 palavras>"}],"lsi_keywords_used":["<kw1>","<kw2>"]},"self_critique":{"intro_hook":"<aprovado|reescrevi pq...>","specificity":"<aprovado|reescrevi pq...>","engagement":"<aprovado|reescrevi pq...>","cta_naturalness":"<aprovado|reescrevi pq...>","beats_top3":"<sim|não, mas...>","unique_insight":"<qual insight nenhum concorrente trouxe>"}}

---

## 6. RESTRIÇÕES DURAS

1. Nunca cite SELIC/IPCA/salário mínimo sem confirmar via web_search no dia.
2. Nunca dê recomendação de ativo específico (CVM proíbe). Apenas classes de ativos.
3. Nunca prometa retorno financeiro.
4. Nunca copie estrutura ou frases de concorrentes.
5. Nunca escreva sobre crypto, day-trade, apostas ou esquemas de renda extra duvidosos.
6. Nunca use emoji em H1, H2 ou meta title.
7. Nunca comece intro com "No mundo de hoje..." ou "Em tempos de..."`

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

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET ?? process.env.imoneycronsecret2026
  if (!cronSecret) return false
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true
  const { searchParams } = new URL(req.url)
  return searchParams.get('secret') === cronSecret
}

function extractFinalJson(content: Anthropic.Messages.ContentBlock[]): string {
  // Collect all text blocks; search from last to first for valid JSON
  const texts = content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map(b => b.text)

  for (let i = texts.length - 1; i >= 0; i--) {
    const cleaned = texts[i].replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const first = cleaned.indexOf('{')
    if (first === -1) continue
    let depth = 0
    let last = -1
    for (let j = first; j < cleaned.length; j++) {
      if (cleaned[j] === '{') depth++
      else if (cleaned[j] === '}') { depth--; if (depth === 0) { last = j; break } }
    }
    if (last !== -1) {
      try { JSON.parse(cleaned.slice(first, last + 1)); return cleaned.slice(first, last + 1) } catch { continue }
    }
  }

  // Fallback: join all text
  const combined = texts.join('\n').replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const first = combined.indexOf('{')
  if (first === -1) return ''
  let depth = 0; let last = -1
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
  if (removed.length) console.log('[SEO v2] Internal links removidos (slug não existe):', removed.join(', '))
  return links.filter(l => valid.has(l.slug))
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dryRun = searchParams.get('dry_run') === 'true'
  if (dryRun) console.log('[SEO v2] Modo dry_run — não insere no banco')

  try {
    if (!dryRun) {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hoje.toISOString())
        .eq('generated_by', 'cron-seo-v2')
      if ((count ?? 0) >= 1)
        return NextResponse.json({ msg: 'Artigo já publicado hoje', count })
    }

    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
    const today = dayNames[new Date().getDay()]
    const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    console.log(`[SEO v2] Iniciando — dia: ${today} | ${dateStr}`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT_V2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      messages: [{
        role: 'user',
        content: `Hoje é ${dateStr} (${today}). Gere o artigo de hoje seguindo o decision tree. Comece pela pesquisa de keyword com web_search.`,
      }],
    })

    const searchCount = response.content.filter(b => b.type === 'server_tool_use').length
    console.log(`[SEO v2] Web searches realizados: ${searchCount}`)

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
        search_count: searchCount,
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

    console.log('[SEO v2] Publicado:', slugFinal, '| palavras:', palavras, '| searches:', searchCount)
    return NextResponse.json({
      sucesso: true,
      titulo: h1,
      slug: slugFinal,
      palavras,
      article_type: parsed.decision?.article_type,
      keyword: parsed.decision?.keyword_principal,
      searches_used: searchCount,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[SEO v2] Erro inesperado:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
