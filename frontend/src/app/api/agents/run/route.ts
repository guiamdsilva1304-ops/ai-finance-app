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
function getDefaultUserMessage(agentId: AgentId, pendingTasksCount: number, seoInsightsContext = ''): string {
  const taskNote = pendingTasksCount > 0
    ? `\n\nVocê tem ${pendingTasksCount} tarefa(s) pendente(s) de outros agentes na fila. Priorize-as.`
    : ''

  const seoNote = seoInsightsContext
    ? `\n\nPESQUISAS ANTERIORES (use como base para escolher tema diferente e incorporar keywords no artigo):\n${seoInsightsContext}`
    : ''

  const messages: Record<AgentId, string> = {
    SEO: `Execute sua rotina autônoma de SEO: realize a pesquisa de um tema novo e escreva o artigo correspondente. Escolha tema relevante para jovens brasileiros, diferente dos já pesquisados.${seoNote}${taskNote}`,
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

  // Para o SEO: enriquece a mensagem com insights de pesquisas anteriores
  let seoInsightsContext = ''
  if (agentId === 'SEO' && !customMessage) {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: insights } = await sb
      .from('seo_insights')
      .select('topic, keywords, search_intents')
      .order('created_at', { ascending: false })
      .limit(10)
    if (insights?.length) {
      seoInsightsContext = insights
        .map((i: { topic: string; keywords: string[]; search_intents: string[] }) =>
          `- Tema: ${i.topic} | Keywords: ${(i.keywords as string[]).slice(0, 4).join(', ')} | Intents: ${(i.search_intents as string[]).slice(0, 2).join('; ')}`)
        .join('\n')
    }
  }

  const userMessage = customMessage ?? getDefaultUserMessage(agentId, pendingTasks.length, seoInsightsContext)

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

  // Extrai JSON robusto: remove backticks, depois tenta parse direto ou por delimitadores
  let parsed: Record<string, unknown> | null = null
  const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  for (const candidate of [cleaned, response]) {
    try {
      parsed = JSON.parse(candidate) as Record<string, unknown>
      break
    } catch {
      // tenta extrair pelo primeiro { e último } balanceado
      const first = candidate.indexOf('{')
      if (first === -1) continue
      let depth = 0
      let last = -1
      for (let i = first; i < candidate.length; i++) {
        if (candidate[i] === '{') depth++
        else if (candidate[i] === '}') { depth--; if (depth === 0) { last = i; break } }
      }
      if (last !== -1) {
        try {
          parsed = JSON.parse(candidate.slice(first, last + 1)) as Record<string, unknown>
          break
        } catch { /* continua */ }
      }
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
    if (agentId === 'SEO') {
      // New two-phase format: { research: {...}, article: {...} }
      const research = parsed.research as Record<string, unknown> | undefined
      const articleData = parsed.article as Record<string, unknown> | undefined

      // Also support legacy single-object format (titulo + conteudo_markdown at root)
      const legacyTitulo = parsed.titulo as string | undefined
      const legacyConteudo = parsed.conteudo_markdown as string | undefined

      // Phase 1: save SEO research internally (never published)
      if (research?.topic) {
        const { error: resErr } = await supabase.from('seo_insights').insert({
          topic: research.topic,
          keywords: research.keywords ?? [],
          search_intents: research.search_intents ?? [],
          suggested_titles: research.suggested_titles ?? [],
          raw_data: JSON.stringify(research),
        })
        if (resErr) console.error('[handleAgentOutput] seo_insights insert error:', resErr.message)
        else await logAgentAction({ agentId, runId, level: 'info', action: 'seo_research_saved', summary: `Pesquisa SEO sobre "${research.topic}" salva internamente` })
      }

      // Phase 2: save reader article to blog_posts
      const titulo = (articleData?.titulo ?? legacyTitulo) as string | undefined
      const conteudo = (articleData?.conteudo_markdown ?? legacyConteudo) as string | undefined

      if (titulo && conteudo) {
        const slugBase = ((articleData?.slug ?? parsed.slug) as string | undefined)
          ?? titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const slugFinal = `${slugBase}-${Date.now()}`
        const palavras = conteudo.split(/\s+/).length
        const excerpt = conteudo.replace(/#+\s*/g, '').replace(/\*\*/g, '').slice(0, 200).trim() + '...'
        const metaDescription = ((articleData?.meta_description ?? parsed.meta_description) as string | undefined) ?? ''
        const keywords = ((articleData?.keywords ?? parsed.keywords) as string[] | undefined) ?? []

        const { error } = await supabase.from('blog_posts').insert({
          title: titulo,
          slug: slugFinal,
          excerpt,
          content: conteudo,
          seo_title: titulo,
          seo_description: metaDescription,
          author: 'Agente SEO',
          category: 'educacao-financeira',
          tags: keywords,
          reading_time_min: Math.max(1, Math.ceil(palavras / 200)),
          published: true,
          published_at: new Date().toISOString(),
          generated_by: 'agente-seo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (error) throw new Error(`Falha ao salvar artigo: ${error.message}`)

        await logAgentAction({ agentId, runId, level: 'success', action: 'blog_post_saved', summary: `Artigo "${titulo}" publicado em /blog/${slugFinal}` })
      }
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
    console.error('[handleAgentOutput]', agentId, msg)
    await logAgentAction({ agentId, runId, level: 'error', action: 'output_save_failed', summary: msg })
  }
}
