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

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET ?? process.env.imoneycronsecret2026
  if (!cronSecret) return false
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true
  const { searchParams } = new URL(req.url)
  return searchParams.get('secret') === cronSecret
}

const RESEARCH_SYSTEM_PROMPT = `Você é o pesquisador de SEO da iMoney, SaaS brasileira de finanças pessoais para jovens 20–35 anos.

## Decision Tree — Tipo de Artigo por Dia

| Dia | Tipo | Objetivo |
|-----|------|----------|
| Segunda | Pillar page longo (3000–5000 palavras) | Autoridade tópica |
| Terça | Fundo de funil — comparativo/alternativa | Conversão |
| Quarta | Cluster do pillar (1500–2000 palavras) | Autoridade + linking |
| Quinta | Fundo de funil — "como fazer X com iMoney" | Conversão |
| Sexta | Atualização de post existente | Freshness |
| Sábado | Trending topic financeiro da semana | Volume |
| Domingo | FAQ/glossário curto (800–1200 palavras) | Featured snippet |

## Concorrentes a monitorar
Mobills, Organizze, Nubank blog, Serasa blog, InfoMoney, Exame Invest, Monerama

## Sua tarefa (máximo 1 web_searches — seja eficiente):
1. Identifique o tipo de artigo do dia baseado no dia da semana informado
2. Use 1 web_search para encontrar a keyword ideal (volume alto, concorrência atacável)
3. Use 1 web_search para analisar os 3 primeiros resultados do Google para essa keyword
4. Use 1 web_search para confirmar dados financeiros atuais: SELIC, IPCA 2026, salário mínimo

## Output — retorne APENAS este JSON sem markdown fences:
{"day_type":"<segunda|terca|quarta|quinta|sexta|sabado|domingo>","article_type":"<pillar|cluster|fundo_funil|atualizacao|trending|faq>","keyword_principal":"<string>","intent":"<informacional|comparativo|transacional>","rationale":"<2-3 frases>","top3_urls":["<url1>","<url2>","<url3>"],"coverage_gaps":["<gap1>","<gap2>"],"our_differentiation":"<como superar em 1 frase>","financial_data":{"selic":"<X%>","ipca_2026":"<X%>","salario_minimo":"R$<X>"},"lsi_keywords":["<kw1>","<kw2>","<kw3>"]}`

export async function GET(req: NextRequest) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    // Idempotência: não repetir pesquisa se já feita hoje
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('seo_insights')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hoje.toISOString())
    if ((count ?? 0) >= 1)
      return NextResponse.json({ msg: 'Pesquisa já realizada hoje', count })

    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
    const today = dayNames[new Date().getDay()]
    const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    console.log(`[SEO Research] Iniciando — dia: ${today} | ${dateStr}`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: RESEARCH_SYSTEM_PROMPT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      messages: [{
        role: 'user',
        content: `Hoje é ${dateStr} (${today}). Pesquise a keyword ideal para o artigo de hoje e analise os concorrentes. Confirme dados financeiros atuais via web_search.`,
      }],
    })

    const searchCount = response.content.filter(b => b.type === 'server_tool_use').length
    console.log(`[SEO Research] Searches realizados: ${searchCount}`)

    // Extrai JSON da resposta (do último bloco de texto para o primeiro)
    const texts = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map(b => b.text)

    let rawJson = ''
    for (let i = texts.length - 1; i >= 0; i--) {
      const cleaned = texts[i].replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const first = cleaned.indexOf('{')
      if (first === -1) continue
      let depth = 0, last = -1
      for (let j = first; j < cleaned.length; j++) {
        if (cleaned[j] === '{') depth++
        else if (cleaned[j] === '}') { depth--; if (depth === 0) { last = j; break } }
      }
      if (last === -1) continue
      try { JSON.parse(cleaned.slice(first, last + 1)); rawJson = cleaned.slice(first, last + 1); break } catch { continue }
    }

    if (!rawJson) {
      console.error('[SEO Research] JSON não extraído')
      return NextResponse.json({ error: 'JSON não extraído da pesquisa' }, { status: 500 })
    }

    const parsed = JSON.parse(rawJson) as {
      keyword_principal: string
      lsi_keywords?: string[]
      intent?: string
    }
    console.log('[SEO Research] Keyword escolhida:', parsed.keyword_principal)

    const { error } = await supabase.from('seo_insights').insert({
      topic: parsed.keyword_principal,
      keywords: parsed.lsi_keywords ?? [],
      search_intents: [parsed.intent ?? ''],
      suggested_titles: [],
      raw_data: rawJson,
    })

    if (error) {
      console.error('[SEO Research] Erro Supabase:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      keyword: parsed.keyword_principal,
      searches_used: searchCount,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[SEO Research] Erro inesperado:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
