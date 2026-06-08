import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase (service role — server only) ───────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'sk-ant-placeholder' })

// ─── Tipos ───────────────────────────────────────────────────────────────────
export type AgentId = 'SEO' | 'GRW'

export interface RunOptions {
  agentId: AgentId
  systemPrompt: string
  userMessage: string          // o prompt principal da execução
  maxTokens?: number
  taskId?: string              // se veio de agent_tasks
  extraContext?: Record<string, unknown>
}

export interface RunResult {
  success: boolean
  runId: string
  agentId: AgentId
  response?: string
  tokensUsed: number
  durationMs: number
  error?: string
}

// ─── 1. Verificar budget ──────────────────────────────────────────────────────
async function checkBudget(agentId: AgentId): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase
    .from('agent_budgets')
    .select('tokens_used, tokens_limit, is_paused, pause_reason')
    .eq('agent_id', agentId)
    .single()

  if (error || !data) return { ok: false, reason: 'Budget record not found' }
  if (data.is_paused)  return { ok: false, reason: data.pause_reason ?? 'Paused by admin' }
  if (data.tokens_used >= data.tokens_limit)
    return { ok: false, reason: `Budget esgotado (${data.tokens_used}/${data.tokens_limit} tokens)` }

  return { ok: true }
}

// ─── 2. Carregar histórico de memória do agente ───────────────────────────────
async function loadAgentMemory(agentId: AgentId, limit = 20) {
  const { data } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Retorna em ordem cronológica (mais antigo primeiro)
  return (data ?? []).reverse() as { role: 'user' | 'assistant'; content: string }[]
}

// ─── 3. Buscar tarefas pendentes de outros agentes ────────────────────────────
export async function pickPendingTasks(agentId: AgentId) {
  const { data } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('to_agent', agentId)
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(3)

  return data ?? []
}

// ─── 4. Marcar tarefa como running/done/failed ────────────────────────────────
export async function updateTaskStatus(
  taskId: string,
  status: 'running' | 'done' | 'failed',
  result?: string
) {
  await supabase
    .from('agent_tasks')
    .update({
      status,
      ...(status === 'running' ? { picked_at: new Date().toISOString() } : {}),
      ...(status !== 'running' ? { done_at: new Date().toISOString(), result } : {}),
    })
    .eq('id', taskId)
}

// ─── 5. Criar tarefa para outro agente ───────────────────────────────────────
export async function createAgentTask({
  fromAgent,
  toAgent,
  taskType,
  payload = {},
  priority = 5,
}: {
  fromAgent: AgentId
  toAgent: AgentId
  taskType: string
  payload?: Record<string, unknown>
  priority?: number
}) {
  const { data, error } = await supabase
    .from('agent_tasks')
    .insert({ from_agent: fromAgent, to_agent: toAgent, task_type: taskType, payload, priority })
    .select('id')
    .single()

  return { id: data?.id, error }
}

// ─── 6. Registrar log ────────────────────────────────────────────────────────
export async function logAgentAction({
  agentId,
  runId,
  level = 'info',
  action,
  summary,
  details = {},
  tokensUsed = 0,
  durationMs,
}: {
  agentId: AgentId
  runId: string
  level?: 'info' | 'success' | 'warning' | 'error'
  action: string
  summary?: string
  details?: Record<string, unknown>
  tokensUsed?: number
  durationMs?: number
}) {
  await supabase.from('agent_logs').insert({
    agent_id: agentId,
    run_id: runId,
    level,
    action,
    summary,
    details,
    tokens_used: tokensUsed,
    duration_ms: durationMs,
  })
}

// ─── 7. Atualizar budget consumido ───────────────────────────────────────────
async function consumeBudget(agentId: AgentId, tokensUsed: number, inputTokens: number) {
  // Custo aproximado: Sonnet input $3/1M, output $15/1M
  const usdCost = (inputTokens * 0.000003) + ((tokensUsed - inputTokens) * 0.000015)

  const { error: rpcErr } = await supabase.rpc('increment_agent_budget', {
    p_agent_id: agentId,
    p_tokens: tokensUsed,
    p_usd: usdCost,
  })

  if (rpcErr) {
    // Fallback: ler valor atual e incrementar
    const { data: current } = await supabase
      .from('agent_budgets')
      .select('tokens_used, usd_used')
      .eq('agent_id', agentId)
      .single()

    if (current) {
      await supabase.from('agent_budgets').update({
        tokens_used: (current.tokens_used ?? 0) + tokensUsed,
        usd_used: (parseFloat(current.usd_used) ?? 0) + usdCost,
      }).eq('agent_id', agentId)
    }
  }
}

// ─── 8. Salvar resposta na memória do agente ─────────────────────────────────
async function saveToMemory(agentId: AgentId, userMessage: string, assistantReply: string, tokensUsed: number) {
  await supabase.from('chat_history').insert([
    { agent_id: agentId, role: 'user',      content: userMessage,     tokens_used: 0 },
    { agent_id: agentId, role: 'assistant', content: assistantReply,  tokens_used: tokensUsed },
  ])
}

// ─── RUNNER PRINCIPAL ─────────────────────────────────────────────────────────
export async function runAgent(opts: RunOptions): Promise<RunResult> {
  const runId = crypto.randomUUID()
  const startMs = Date.now()
  const { agentId, systemPrompt, userMessage, maxTokens = 2000, taskId } = opts

  // 1. Verificar budget
  const budget = await checkBudget(agentId)
  if (!budget.ok) {
    await logAgentAction({
      agentId, runId, level: 'warning',
      action: 'run_skipped',
      summary: `Execução bloqueada: ${budget.reason}`,
    })
    return { success: false, runId, agentId, tokensUsed: 0, durationMs: 0, error: budget.reason }
  }

  // 2. Marcar tarefa como running (se veio de agent_tasks)
  if (taskId) await updateTaskStatus(taskId, 'running')

  // 3. Carregar memória
  const history = await loadAgentMemory(agentId)

  await logAgentAction({ agentId, runId, action: 'run_started', summary: userMessage.slice(0, 120) })

  try {
    // 4. Chamar Claude
    const messages: Anthropic.MessageParam[] = [
      ...history,
      { role: 'user', content: userMessage },
    ]

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    })

    const response = completion.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('\n')

    const tokensUsed = completion.usage.input_tokens + completion.usage.output_tokens
    const durationMs = Date.now() - startMs

    // 5. Salvar memória + consumir budget + logar
    await Promise.all([
      saveToMemory(agentId, userMessage, response, tokensUsed),
      consumeBudget(agentId, tokensUsed, completion.usage.input_tokens),
      logAgentAction({
        agentId, runId, level: 'success',
        action: 'run_completed',
        summary: response.slice(0, 200),
        details: { stop_reason: completion.stop_reason },
        tokensUsed,
        durationMs,
      }),
    ])

    // 6. Finalizar tarefa
    if (taskId) await updateTaskStatus(taskId, 'done', response.slice(0, 500))

    return { success: true, runId, agentId, response, tokensUsed, durationMs }

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const durationMs = Date.now() - startMs

    await logAgentAction({
      agentId, runId, level: 'error',
      action: 'run_failed',
      summary: errorMsg,
      durationMs,
    })

    if (taskId) await updateTaskStatus(taskId, 'failed', errorMsg)

    return { success: false, runId, agentId, tokensUsed: 0, durationMs, error: errorMsg }
  }
}
