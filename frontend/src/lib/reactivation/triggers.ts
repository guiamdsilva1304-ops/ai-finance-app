import type { SupabaseClient } from '@supabase/supabase-js'

export interface TriggerResult {
  eligible: boolean
  metaNome?: string
  valorAlvo?: number
  valorAtual?: number
  valorFaltante?: number
}

// Trilha 1: user has not logged in for 7+ days
// Uses auth.admin.getUserById to get last_sign_in_at
export async function checkSumiu(supabase: SupabaseClient, userId: string): Promise<TriggerResult> {
  const { data, error } = await supabase.auth.admin.getUserById(userId)
  if (error || !data?.user) return { eligible: false }
  const lastSignIn = data.user.last_sign_in_at
  if (!lastSignIn) return { eligible: false }
  const daysSince = (Date.now() - new Date(lastSignIn).getTime()) / 86400000
  return { eligible: daysSince >= 7 }
}

// Trilha 2: user has a goal created 5+ days ago with no transactions since goal creation
export async function checkMetaOrfa(supabase: SupabaseClient, userId: string): Promise<TriggerResult> {
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]

  const { data: metas, error } = await supabase
    .from('metas')
    .select('id, nome, valor_alvo, valor_atual, criada_em')
    .eq('user_id', userId)
    .eq('concluida', false)
    .lte('criada_em', fiveDaysAgo)
    .limit(1)

  if (error || !metas?.length) return { eligible: false }

  const meta = metas[0] as { id: string; nome: string; valor_alvo: number; valor_atual: number; criada_em: string }

  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('date', meta.criada_em)

  if ((count ?? 0) > 0) return { eligible: false }

  const valorFaltante = Math.max(0, meta.valor_alvo - meta.valor_atual)
  return { eligible: true, metaNome: meta.nome, valorAlvo: meta.valor_alvo, valorAtual: meta.valor_atual, valorFaltante }
}

// Trilha 3: user sent 5+ messages to the AI advisor in the last 14 days and is not Pro
export async function checkFreeEngajado(supabase: SupabaseClient, userId: string): Promise<TriggerResult> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('user_id', userId)
    .maybeSingle()

  if (profile?.plan === 'pro') return { eligible: false }

  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString()

  const { count } = await supabase
    .from('chat_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', fourteenDaysAgo)

  return { eligible: (count ?? 0) >= 5 }
}

// Trilha 4: user has a goal at 70%+ progress with no transactions in the last 7 days
export async function checkQuaseLa(supabase: SupabaseClient, userId: string): Promise<TriggerResult> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const { count: recentTxCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)

  if ((recentTxCount ?? 0) > 0) return { eligible: false }

  const { data: metas, error } = await supabase
    .from('metas')
    .select('nome, valor_alvo, valor_atual')
    .eq('user_id', userId)
    .eq('concluida', false)
    .gt('valor_alvo', 0)

  if (error || !metas?.length) return { eligible: false }

  const eligible = (metas as { nome: string; valor_alvo: number; valor_atual: number }[]).find(
    m => m.valor_alvo > 0 && m.valor_atual / m.valor_alvo >= 0.7
  )

  if (!eligible) return { eligible: false }

  const valorFaltante = Math.max(0, eligible.valor_alvo - eligible.valor_atual)
  return {
    eligible: true,
    metaNome: eligible.nome,
    valorAlvo: eligible.valor_alvo,
    valorAtual: eligible.valor_atual,
    valorFaltante,
  }
}
