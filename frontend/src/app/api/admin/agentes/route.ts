import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MEMORIA_ADMIN_ID = '00000000-0000-0000-0000-000000000001'
const MAX_MEMORIA = 40 // últimas 40 mensagens por agente

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
  const status = artigo.publicar_automaticamente ? 'publicado' : 'rascunho'
  await supabase.from('admin_posts').insert({
    titulo: artigo.titulo, slug: artigo.slug,
    meta_description: artigo.meta_description, conteudo: artigo.conteudo,
    status, criado_em: new Date().toISOString(),
  })
  return status
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
  const clean = text.replace(/```json|```/g, '').trim()
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
      return NextResponse.json({ error: 'messages obrigatório' }, { status: 400 })

    // última mensagem do usuário para salvar
    const ultimaUser = messages[messages.length - 1]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt ?? 'Você é um assistente interno da iMoney. Seja direto e prático.',
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : 'Sem resposta.'
    const json = extrairJSON(content)

    // salva no Supabase (memória persistente)
    if (agentId && ultimaUser?.role === 'user') {
      await salvarMensagem(agentId, 'user', ultimaUser.content).catch(() => null)
      await salvarMensagem(agentId, 'assistant', content).catch(() => null)
    }

    // agente SEO — publica artigo
    if (agentId === 'seo' && json?.artigo) {
      const status = await publicarArtigo(json.artigo).catch(() => 'erro')
      return NextResponse.json({ content: JSON.stringify({ ...json, artigo: { ...json.artigo, status_publicacao: status } }) })
    }

    // agente growth — executa ações
    if (agentId === 'growth' && json?.acoes) {
      await executarAcoesGrowth(json.acoes).catch(() => null)
    }

    return NextResponse.json({ content })

  } catch (error) {
    console.error('[/api/admin/agentes]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
