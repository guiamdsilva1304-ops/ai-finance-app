import { NextRequest, NextResponse } from 'next/server'
import { runAgent, pickPendingTasks, logAgentAction, type AgentId } from '@/lib/agent-runner'
import { AGENT_PROMPTS } from '@/lib/agent-prompts'

// Protege a rota com CRON_SECRET (mesmo padrão dos outros crons da iMoney)
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.imoneycronsecret2026
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

// Mensagens de execução autônoma padrão por agente
function getDefaultUserMessage(agentId: AgentId, pendingTasksCount: number): string {
  const taskNote = pendingTasksCount > 0
    ? `\n\nVocê tem ${pendingTasksCount} tarefa(s) pendente(s) de outros agentes na fila. Priorize-as.`
    : ''

  const messages: Record<AgentId, string> = {
    SEO: `Execute sua rotina autônoma: escreva 1 artigo de blog sobre finanças pessoais para hoje. Escolha um tema relevante para jovens brasileiros. Retorne JSON completo.${taskNote}`,
    GRW: `Execute sua rotina autônoma: analise o estado atual do funil e crie ou atualize a campanha de email mais prioritária. Retorne JSON do email.${taskNote}`,
  }

  return messages[agentId]
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let agentId: AgentId
  let customMessage: string | undefined
  let taskId: string | undefined

  try {
    const body = await req.json()
    agentId = body.agent as AgentId
    customMessage = body.message
    taskId = body.task_id
  } catch {
    // Suporte a query params para cron jobs simples
    const { searchParams } = new URL(req.url)
    agentId = searchParams.get('agent') as AgentId
  }

  const validAgents: AgentId[] = ['SEO', 'GRW']
  if (!agentId || !validAgents.includes(agentId)) {
    return NextResponse.json({ error: `Agent inválido. Use: ${validAgents.join(', ')}` }, { status: 400 })
  }

  const systemPrompt = AGENT_PROMPTS[agentId]
  if (!systemPrompt) {
    return NextResponse.json({ error: 'System prompt não encontrado' }, { status: 500 })
  }

  // Buscar tarefas pendentes de outros agentes
  const pendingTasks = await pickPendingTasks(agentId)
  const userMessage = customMessage ?? getDefaultUserMessage(agentId, pendingTasks.length)

  // Enriquecer mensagem com contexto das tarefas pendentes
  let fullMessage = userMessage
  if (pendingTasks.length > 0) {
    const tasksContext = pendingTasks.map(t =>
      `- [${t.task_type}] de ${t.from_agent}: ${JSON.stringify(t.payload)}`
    ).join('\n')
    fullMessage += `\n\n=== TAREFAS DE OUTROS AGENTES ===\n${tasksContext}`
  }

  const result = await runAgent({
    agentId,
    systemPrompt,
    userMessage: fullMessage,
    maxTokens: agentId === 'SEO' ? 3000 : 2000,
    taskId,
  })

  // Ações pós-run específicas por agente (salvar output nas tabelas corretas)
  if (result.success && result.response) {
    await handleAgentOutput(agentId, result.response, result.runId)
  }

  return NextResponse.json(result, {
    status: result.success ? 200 : 422,
  })
}

// GET: para cron jobs do Vercel (que fazem GET por padrão)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return POST(req)
}

// ─── Pós-processamento por agente ────────────────────────────────────────────
async function handleAgentOutput(agentId: AgentId, response: string, runId: string) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Extrai JSON robusto: nunca usa regex com *? pois quebra quando o conteúdo markdown tem backticks
  let parsed: Record<string, unknown> | null = null
  try {
    parsed = JSON.parse(response) as Record<string, unknown>
  } catch {
    const first = response.indexOf('{')
    const last = response.lastIndexOf('}')
    if (first !== -1 && last > first) {
      try {
        parsed = JSON.parse(response.slice(first, last + 1)) as Record<string, unknown>
      } catch { /* não era JSON válido */ }
    }
  }

  if (!parsed) {
    await logAgentAction({
      agentId, runId, level: 'info',
      action: 'output_not_structured',
      summary: 'Resposta não continha JSON válido — salvo apenas na memória',
    })
    return
  }

  try {
    if (agentId === 'SEO' && parsed.titulo && parsed.conteudo_markdown) {
      const titulo = parsed.titulo as string
      const conteudo = parsed.conteudo_markdown as string
      const slugBase = (parsed.slug as string | undefined) ?? titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const slugFinal = `${slugBase}-${Date.now()}`
      const palavras = conteudo.split(/\s+/).length
      const excerpt = conteudo.replace(/#+\s*/g, '').replace(/\*\*/g, '').slice(0, 200).trim() + '...'

      const { error } = await supabase.from('blog_posts').insert({
        title: titulo,
        slug: slugFinal,
        excerpt,
        content: conteudo,
        seo_title: titulo,
        seo_description: (parsed.meta_description as string | undefined) ?? '',
        author: 'Agente SEO',
        category: 'educacao-financeira',
        tags: (parsed.keywords as string[] | undefined) ?? [],
        reading_time_min: Math.max(1, Math.ceil(palavras / 200)),
        published: false,
        published_at: null,
        generated_by: 'agente-seo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) throw new Error(`Falha ao salvar artigo: ${error.message}`)

      await logAgentAction({ agentId, runId, level: 'success', action: 'blog_post_saved', summary: `Artigo "${titulo}" salvo em /blog/${slugFinal}` })
    }

    if (agentId === 'GRW' && parsed.assunto && parsed.corpo_html) {
      const { error } = await supabase.from('email_queue').insert({
        assunto: parsed.assunto,
        preview_text: (parsed.preview_text as string | undefined) ?? '',
        corpo_html: parsed.corpo_html,
        segmento: (parsed.segmento_alvo as string | undefined) ?? 'todos',
        status: 'pending',
        origem: 'agente_grw',
      })
      if (error) throw new Error(`Falha ao enfileirar email: ${error.message}`)
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[handleAgentOutput cron]', agentId, msg)
    await logAgentAction({ agentId, runId, level: 'error', action: 'output_save_failed', summary: msg })
  }
}
