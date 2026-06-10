import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'sk-ant-placeholder' })

const SYSTEM_PROMPTS: Record<string, string> = {
  seo: 'Voce e o agente SEO da iMoney. Quando pedirem para escrever e publicar um artigo, retorne APENAS um objeto JSON valido sem nenhum texto antes ou depois, sem blocos de codigo (sem ```). O campo conteudo NAO pode conter backticks triplos. Formato: {"artigo":{"titulo":"...","slug":"titulo-em-kebab","meta_description":"...","conteudo":"artigo completo em markdown sem blocos de codigo","publicar_automaticamente":true}}',
  growth: 'Voce e o agente de growth da iMoney. Foco: converter free em pagantes (R$ 14,90/mes). Retorne APENAS um objeto JSON valido sem texto extra, sem blocos de codigo (sem ```). Formato: {"acoes":[{"tipo":"email","descricao":"...","status":"executado","detalhe":"..."}]}',
}

async function publicarArtigo(artigo: { titulo: string; slug: string; meta_description: string; conteudo: string; publicar_automaticamente: boolean }) {
  const palavras = artigo.conteudo.split(/\s+/).length
  const reading_time_min = Math.max(1, Math.ceil(palavras / 200))
  const excerpt = artigo.conteudo.replace(/#+\s/g, '').replace(/\*\*/g, '').slice(0, 200).trim() + '...'
  const slugFinal = `${artigo.slug}-${Date.now()}`

  const { error } = await supabase.from('blog_posts').insert({
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

  if (error) throw new Error(`Falha ao salvar artigo no banco: ${error.message}`)

  return `Artigo "${artigo.titulo}" ${artigo.publicar_automaticamente ? 'publicado' : 'salvo como rascunho'} em /blog/${slugFinal}`
}

async function executarAcoesGrowth(acoes: Array<{ tipo: string; descricao: string; status: string; detalhe?: string }>) {
  // Campanhas de growth são broadcast (sem user_id individual) — apenas registra as ações planejadas
  // O envio real acontece via lib/agents/growth.ts que busca usuários e enfileira com user_id correto
  const executadas = acoes.filter(a => a.status === 'executado')
  if (executadas.length === 0) return 'Nenhuma ação marcada como executada.'
  return executadas.map(a => `✓ ${a.tipo}: ${a.descricao}`).join('\n')
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
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPTS[agent_id] ?? 'Voce e um agente da iMoney. Responda em markdown.',
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : ''
    let resultado = content.slice(0, 500)

    // Executa ações automáticas baseadas no agente
    try {
      // Extrai JSON robusto: tenta parse direto, depois pelo primeiro/último { }
      // Não usa regex com *? (non-greedy) pois quebra com backticks dentro do conteúdo markdown
      let json: Record<string, unknown> | null = null
      try {
        json = JSON.parse(content) as Record<string, unknown>
      } catch {
        const first = content.indexOf('{')
        const last = content.lastIndexOf('}')
        if (first !== -1 && last > first) {
          json = JSON.parse(content.slice(first, last + 1)) as Record<string, unknown>
        }
      }

      if (json && agent_id === 'seo' && json.artigo) {
        resultado = await publicarArtigo(json.artigo as { titulo: string; slug: string; meta_description: string; conteudo: string; publicar_automaticamente: boolean })
      }
      if (json && agent_id === 'growth' && json.acoes) {
        resultado = await executarAcoesGrowth(json.acoes as Array<{ tipo: string; descricao: string; status: string; detalhe?: string }>)
      }
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      console.error('[/api/admin/hub] JSON parse/save error:', msg, '| raw[:300]:', content.slice(0, 300))
      resultado = `Erro ao processar resposta: ${msg}`
    }

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
