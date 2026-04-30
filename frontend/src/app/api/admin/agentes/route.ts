import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, agentId } = await req.json()

    if (!messages || !Array.isArray(messages))
      return NextResponse.json({ error: 'messages obrigatório' }, { status: 400 })

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

    // agente SEO — publica artigo automaticamente
    if (agentId === 'seo' && json?.artigo) {
      const status = await publicarArtigo(json.artigo).catch(() => 'erro')
      return NextResponse.json({ content: JSON.stringify({ ...json, artigo: { ...json.artigo, status_publicacao: status } }) })
    }

    // agente growth — executa ações no Supabase
    if (agentId === 'growth' && json?.acoes) {
      await executarAcoesGrowth(json.acoes).catch(() => null)
    }

    // IMPORTANTE: sempre retorna o content original intacto
    // o parseResposta no frontend faz a detecção de JSON
    return NextResponse.json({ content })

  } catch (error) {
    console.error('[/api/admin/agentes]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
