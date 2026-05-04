import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MEMORIA_ADMIN_ID = '00000000-0000-0000-0000-000000000001'
const MAX_MEMORIA = 40

async function carregarMemoria(agentId: string) {
  const { data } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('agent_id', agentId)
    .eq('user_id', MEMORIA_ADMIN_ID)
    .order('created_at', { ascending: false })
    .limit(MAX_MEMORIA)
  return (data ?? []).reverse()
}

async function salvarMensagem(agentId: string, role: 'user' | 'assistant', content: string) {
  await supabase.from('chat_history').insert({
    agent_id: agentId,
    user_id: MEMORIA_ADMIN_ID,
    role,
    content,
    created_at: new Date().toISOString(),
  })
}

async function publicarArtigo(artigo: {
  titulo: string; slug: string; meta_description: string
  conteudo: string; publicar_automaticamente: boolean
}) {
  const published = artigo.publicar_automaticamente
  const palavras = artigo.conteudo.split(/\s+/).length
  const reading_time_min = Math.max(1, Math.ceil(palavras / 200))
  const excerpt = artigo.conteudo.replace(/#+\s/g, '').replace(/\*\*/g, '').slice(0, 200).trim() + '...'

  const { error } = await supabase.from('blog_posts').insert({
    title: artigo.titulo,
    slug: artigo.slug,
    excerpt,
    content: artigo.conteudo,
    seo_title: artigo.titulo,
    seo_description: artigo.meta_description ?? '',
    author: 'Gui da iMoney',
    category: 'educacao-financeira',
    tags: [],
    reading_time_min,
    published,
    published_at: published ? new Date().toISOString() : null,
    generated_by: 'agente-seo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
  return published ? 'publicado' : 'rascunho'
}

function extrairJSON(text: string) {
  const blocoJson = text.match(/```json([\s\S]*?)```/)
  if (blocoJson) {
    try { return JSON.parse(blocoJson[1].trim()) } catch { }
  }
  const clean = text.replace(/```[\s\S]*?```/g, '').trim()
  const first = clean.indexOf('{')
  const last = clean.lastIndexOf('}')
  if (first === -1 || last === -1) return null
  try { return JSON.parse(clean.slice(first, last + 1)) } catch { return null }
}

const SYSTEM_PROMPTS: Record<string, string> = {
  seo: `Voce e o agente SEO da iMoney, app brasileiro de financas pessoais com IA para jovens de 20-30 anos. Hoje e maio de 2026.

Voce tem acesso a noticias economicas recentes do Brasil e do mundo via web search. Use isso para:
1. Escrever artigos baseados em acontecimentos economicos atuais (SELIC, inflacao, dolar, mercado financeiro, politica economica)
2. Conectar noticias com financas pessoais praticas (ex: "SELIC subiu — o que voce deve fazer com sua reserva?")
3. Publicar conteudo oportuno e relevante que rankeia no Google

Quando pedirem para escrever e publicar um artigo, use web search para buscar noticias recentes relevantes, depois retorne APENAS JSON sem backticks:
{"artigo":{"titulo":"...","slug":"slug-em-kebab-case","meta_description":"...","conteudo":"artigo completo em markdown com pelo menos 800 palavras","publicar_automaticamente":true}}

Para outros pedidos responda em markdown normal com insights baseados em dados atuais.`,

  conteudo: `Voce e o agente de conteudo da iMoney para jovens brasileiros de 20-30 anos. Tom: amigo que entende de dinheiro. Hoje e maio de 2026.

Quando pedirem o plano da semana, retorne APENAS JSON sem backticks com o schema correto de plano semanal.
Para outros pedidos responda em markdown normal.`,

  growth: `Voce e o agente de growth da iMoney. Foco: converter free em pagantes (R$ 29,90/mes). Hoje e maio de 2026. Responda em markdown.`,

  dados: `Voce e o agente de dados da iMoney. Burn: R$ 660/mes. Break-even: 22 usuarios pagantes. Hoje e maio de 2026. Responda em markdown com analises claras.`,

  dev: `Voce e o agente dev da iMoney. Stack: Next.js 14, Supabase, Claude API, Vercel. Hoje e maio de 2026. Responda em markdown com patches e analises tecnicas.`,
}

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ messages: [] })
  const messages = await carregarMemoria(agentId)
  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, agentId } = await req.json()
    if (!messages || !Array.isArray(messages))
      return NextResponse.json({ error: 'messages obrigatorio' }, { status: 400 })

    const system = systemPrompt || SYSTEM_PROMPTS[agentId] || 'Voce e um agente da iMoney. Responda em markdown.'

    // Agente SEO usa web search para noticias atuais
    const tools = agentId === 'seo' ? [{ type: 'web_search_20250305' as const, name: 'web_search' }] : undefined

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system,
      tools,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    // Extrai texto da resposta (pode ter tool_use intercalado)
    const content = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')

    // Salva na memória
    if (agentId) {
      const lastUser = messages[messages.length - 1]
      if (lastUser?.role === 'user') await salvarMensagem(agentId, 'user', lastUser.content)
      await salvarMensagem(agentId, 'assistant', content)
    }

    // Executa ações automáticas
    const json = extrairJSON(content)
    if (json && agentId === 'seo' && json.artigo) {
      try {
        const status = await publicarArtigo(json.artigo)
        console.log(`[SEO] Artigo ${status}: ${json.artigo.slug}`)
      } catch (e) {
        console.error('[SEO] Erro ao publicar:', e)
      }
    }

    return NextResponse.json({ content, agentId })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/admin/agentes]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
