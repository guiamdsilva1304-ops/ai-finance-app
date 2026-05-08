import { NextRequest, NextResponse } from 'next/server'
import { runAgent, pickPendingTasks, logAgentAction, type AgentId } from '@/lib/agent-runner'
import { AGENT_PROMPTS } from '@/lib/agent-prompts'

// Protege a rota com CRON_SECRET (mesmo padrão dos outros crons da iMoney)
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.imoneycronsecret2026
  if (!secret) return false
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('secret')
  return token === secret
}

// Mensagens de execução autônoma padrão por agente
function getDefaultUserMessage(agentId: AgentId, pendingTasksCount: number): string {
  const taskNote = pendingTasksCount > 0
    ? `\n\nVocê tem ${pendingTasksCount} tarefa(s) pendente(s) de outros agentes na fila. Priorize-as.`
    : ''

  const messages: Record<AgentId, string> = {
    MKT: `Execute sua rotina autônoma: crie a pauta de conteúdo para os próximos 2 dias (formatos: carrossel + reels). Considere tendências financeiras atuais no Brasil.${taskNote}`,
    SEO: `Execute sua rotina autônoma: escreva 1 artigo de blog sobre finanças pessoais para hoje. Escolha um tema relevante para jovens brasileiros. Retorne JSON completo.${taskNote}`,
    GRW: `Execute sua rotina autônoma: analise o estado atual do funil e crie ou atualize a campanha de email mais prioritária. Retorne JSON do email.${taskNote}`,
    DAD: `Execute sua rotina autônoma: gere o relatório diário de saúde da iMoney. Analise métricas disponíveis, identifique insights e crie tarefas para outros agentes se necessário.${taskNote}`,
    DEV: `Execute sua rotina: revise o backlog de melhorias técnicas e proponha a próxima melhoria de maior impacto. Retorne diff ou pseudocódigo.${taskNote}`,
    VID: `Execute sua rotina autônoma: crie 1 roteiro de vídeo curto (30-60s) sobre finanças pessoais para TikTok/Reels. Retorne JSON completo com prompt para geração de vídeo.${taskNote}`,
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

  const validAgents: AgentId[] = ['MKT', 'SEO', 'GRW', 'DAD', 'DEV', 'VID']
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

  try {
    // Tenta extrair JSON da resposta do agente
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/(\{[\s\S]*\})/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[1] ?? jsonMatch[0]) : null

    if (agentId === 'SEO' && parsed?.titulo && parsed?.conteudo_markdown) {
      await supabase.from('blog_posts').insert({
        titulo: parsed.titulo,
        slug: parsed.slug ?? parsed.titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        conteudo: parsed.conteudo_markdown,
        meta_description: parsed.meta_description ?? '',
        status: 'draft', // admin revisa antes de publicar
        autor: 'Agente SEO',
      })
    }

    if (agentId === 'GRW' && parsed?.assunto && parsed?.corpo_html) {
      await supabase.from('email_queue').insert({
        assunto: parsed.assunto,
        preview_text: parsed.preview_text ?? '',
        corpo_html: parsed.corpo_html,
        segmento: parsed.segmento_alvo ?? 'todos',
        status: 'pending',
        origem: 'agente_grw',
      })
    }

    if (agentId === 'VID' && parsed?.roteiro && parsed?.prompt_video) {
      await supabase.from('video_queue').insert({
        titulo: parsed.titulo ?? 'Vídeo gerado pelo agente',
        roteiro: parsed.roteiro,
        prompt: parsed.prompt_video,
        status: 'pending',
        origem: 'agente_vid',
      })
    }

  } catch {
    // Output não era JSON estruturado — só loga, não falha
    await logAgentAction({
      agentId,
      runId,
      level: 'info',
      action: 'output_not_structured',
      summary: 'Resposta não continha JSON estruturado — salvo apenas na memória',
    })
  }
}
