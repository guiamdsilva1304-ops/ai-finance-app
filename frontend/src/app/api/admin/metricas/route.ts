import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data } = await supabase.rpc('get_hub_metrics').single()

    if (data) return NextResponse.json(data)

    // Fallback com queries individuais
    const [
      { count: total_usuarios },
      { count: novos_semana },
      { count: novos_hoje },
      { count: artigos_publicados },
      { count: artigos_semana },
      { count: emails_enviados },
      { count: aprovacoes_pendentes },
      { count: missoes_concluidas },
      { count: pagantes },
    ] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('published', true),
      supabase.from('blog_posts').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'enviado'),
      supabase.from('approval_queue').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('agent_missions').select('*', { count: 'exact', head: true }).eq('status', 'concluido'),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ])

    // MRR
    const mrr = (pagantes ?? 0) * 29.90
    const break_even = 22
    const progresso_break_even = Math.min(100, Math.round(((pagantes ?? 0) / break_even) * 100))

    return NextResponse.json({
      total_usuarios: total_usuarios ?? 0,
      novos_semana: novos_semana ?? 0,
      novos_hoje: novos_hoje ?? 0,
      artigos_publicados: artigos_publicados ?? 0,
      artigos_semana: artigos_semana ?? 0,
      emails_enviados: emails_enviados ?? 0,
      aprovacoes_pendentes: aprovacoes_pendentes ?? 0,
      missoes_concluidas: missoes_concluidas ?? 0,
      pagantes: pagantes ?? 0,
      mrr,
      break_even,
      progresso_break_even,
      atualizado_em: new Date().toISOString(),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/admin/metricas]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
