import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPTS: Record<string, string> = {
  seo: 'Voce e o agente SEO da iMoney. Quando pedirem para escrever e publicar um artigo, retorne APENAS JSON sem backticks: {"artigo":{"titulo":"...","slug":"...","meta_description":"...","conteudo":"artigo completo em markdown","publicar_automaticamente":true}}',
  growth: 'Voce e o agente de growth da iMoney. Foco: converter free em pagantes (R$ 29,90/mes). Quando pedirem uma acao, retorne APENAS JSON sem backticks: {"acoes":[{"tipo":"email","descricao":"...","status":"executado","detalhe":"..."}]}',
}

async function publicarArtigo(artigo: { titulo: string; slug: string; meta_description: string; conteudo: string; publicar_automaticamente: boolean }) {
  const palavras = artigo.conteudo.split(/\s+/).length
  const reading_time_min = Math.max(1, Math.ceil(palavras / 200))
  const excerpt = artigo.conteudo.replace(/#+\s/g, '').replace(/\*\*/g, '').slice(0, 200).trim() + '...'
  const slugFinal = `${artigo.slug}-${Date.now()}`

  await supabase.from('blog_posts').insert({
    title: artigo.titulo,
    slug: slugFinal,
    excerpt,
    content: artigo.conteudo,
    seo_title: artigo.titulo,
    seo_description: artigo.meta_description ?? '',
    author: 'Gui da iMoney',
    category: 'educacao-financeira',
    tags: [],
    reading_time_min,
    published: artigo.publicar_automaticamente,
    published_at: artigo.publicar_automaticamente ? new Date().toISOString() : null,
    generated_by: 'agente-seo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return `Artigo "${artigo.titulo}" ${artigo.publicar_automaticamente ? 'publicado' : 'salvo como rascunho'} em /blog/${slugFinal}`
}

async function executarAcoesGrowth(acoes: Array<{ tipo: string; descricao: string; status: string; detalhe?: string }>) {
  let resultado = ''
  for (const acao of acoes) {
    if (acao.status !== 'executado') continue
    if (acao.tipo === 'email' && acao.detalhe) {
      await supabase.from('email_queue').insert({
        tipo: 'growth', conteudo: acao.detalhe, descricao: acao.descricao,
        criado_em: new Date().toISOString(), status: 'pendente',
      })
      resultado += `✓ Email agendado: ${acao.descricao}\n`
    }
  }
  return resultado || 'Ações de growth executadas'
}

export async function GET() {
  const { data, error } = await supabase
    .from('agent_missions')
    .select('*')
    .order('agent_id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ missoes: data })
}

export async function POST(req: NextRequest) {
  let missao_id: string | undefined
  try {
    const body = await req.json()
    missao_id = body.missao_id
    const { agent_id, prompt } = body
    if (!missao_id || !agent_id || !prompt)
      return NextResponse.json({ error: 'missao_id, agent_id e prompt obrigatorios' }, { status: 400 })

    // Marca como executando
    await supabase.from('agent_missions').update({ status: 'executando' }).eq('id', missao_id)

    // Chama o Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPTS[agent_id] ?? 'Voce e um agente da iMoney. Responda em markdown.',
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : ''
    let resultado = content.slice(0, 500)

    // Executa ações automáticas baseadas no agente
    try {
      const blocoJson = content.match(/```json([\s\S]*?)```/)
      const jsonStr = blocoJson ? blocoJson[1].trim() : content
      const first = jsonStr.indexOf('{')
      const last = jsonStr.lastIndexOf('}')
      const json = first !== -1 && last !== -1 ? JSON.parse(jsonStr.slice(first, last + 1)) : null

      if (json && agent_id === 'seo' && json.artigo) {
        resultado = await publicarArtigo(json.artigo)
      }
      if (json && agent_id === 'growth' && json.acoes) {
        resultado = await executarAcoesGrowth(json.acoes)
      }
      if (json && agent_id === 'conteudo' && json.plano) {
        resultado = `✓ Plano gerado: ${json.plano.length} posts para a semana`
      }
    } catch { /* usa resultado parcial */ }

    // Busca contador atual para incrementar corretamente
    const { data: missaoAtual } = await supabase
      .from('agent_missions')
      .select('execucoes_total')
      .eq('id', missao_id)
      .single()

    await supabase.from('agent_missions').update({
      status: 'concluido',
      ultimo_resultado: resultado,
      ultima_execucao: new Date().toISOString(),
      proxima_execucao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      execucoes_total: (missaoAtual?.execucoes_total ?? 0) + 1,
    }).eq('id', missao_id)

    return NextResponse.json({ resultado, sucesso: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (missao_id) {
      await supabase.from('agent_missions').update({ status: 'erro', ultimo_resultado: msg }).eq('id', missao_id)
    }
    console.error('[/api/admin/hub]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
