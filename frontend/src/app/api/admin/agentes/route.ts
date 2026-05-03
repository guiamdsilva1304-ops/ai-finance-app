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

async function executarAcoesGrowth(acoes: Array<{ tipo: string; descricao: string; status: string; detalhe?: string }>) {
  for (const acao of acoes) {
    if (acao.status !== 'executado') continue
    if (acao.tipo === 'email' && acao.detalhe) {
      await supabase.from('email_queue').insert({
        tipo: 'growth', conteudo: acao.detalhe, descricao: acao.descricao,
        criado_em: new Date().toISOString(), status: 'pendente',
      })
    }
  }
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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : 'Sem resposta.'

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
    if (json && agentId === 'growth' && json.acoes) {
      await executarAcoesGrowth(json.acoes).catch(e => console.error('[Growth]', e))
    }

    return NextResponse.json({ content, agentId })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/admin/agentes]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
