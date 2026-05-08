import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSeoAgent } from '@/lib/agents/seo'
import { runGrowthAgent } from '@/lib/agents/growth'
import { runConteudoAgent } from '@/lib/agents/conteudo'
import { runDadosAgent } from '@/lib/agents/dados'
import { runDevAgent } from '@/lib/agents/dev'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const AGENT_RUNNERS: Record<string, (mission: any) => Promise<string>> = {
  seo: runSeoAgent,
  growth: runGrowthAgent,
  conteudo: runConteudoAgent,
  dados: runDadosAgent,
  dev: runDevAgent,
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: missions, error } = await supabase
    .from('agent_missions')
    .select('*')
    .eq('status', 'executando')
    .lte('proxima_execucao', now)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!missions || missions.length === 0) return NextResponse.json({ message: 'Nenhuma missão para executar agora.' })

  const results: any[] = []

  for (const mission of missions) {
    const runId = crypto.randomUUID()
    const startedAt = new Date().toISOString()

    await supabase.from('agent_runs').insert({
      id: runId,
      job_id: mission.id,
      agent_id: mission.agent_id,
      mission_id: mission.id,
      status: 'running',
      started_at: startedAt,
    })

    const runner = AGENT_RUNNERS[mission.agent_id]

    if (!runner) {
      await supabase.from('agent_runs').update({
        status: 'error',
        error: `Runner não encontrado para agent_id: ${mission.agent_id}`,
        completed_at: new Date().toISOString(),
      }).eq('id', runId)
      continue
    }

    try {
      const output = await runner(mission)
      const completedAt = new Date().toISOString()
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()

      await supabase.from('agent_runs').update({
        status: 'success',
        output,
        completed_at: completedAt,
        duration_ms: durationMs,
      }).eq('id', runId)

      await supabase.from('agent_missions').update({
        ultima_execucao: completedAt,
        ultimo_resultado: output.slice(0, 500),
        execucoes_total: (mission.execucoes_total || 0) + 1,
        proxima_execucao: calcularProxima(mission.frequencia),
      }).eq('id', mission.id)

      await supabase.from('agent_logs').insert({
        agent_id: mission.agent_id,
        tipo: 'success',
        titulo: mission.titulo,
        conteudo: output.slice(0, 1000),
        metadata: { run_id: runId, mission_id: mission.id, duration_ms: durationMs },
        status: 'ativo',
      })

      results.push({ mission: mission.titulo, agent: mission.agent_id, status: 'success' })
    } catch (err: any) {
      const errorMsg = err?.message || String(err)

      await supabase.from('agent_runs').update({
        status: 'error',
        error: errorMsg,
        completed_at: new Date().toISOString(),
      }).eq('id', runId)

      await supabase.from('agent_logs').insert({
        agent_id: mission.agent_id,
        tipo: 'error',
        titulo: mission.titulo,
        conteudo: errorMsg,
        metadata: { run_id: runId, mission_id: mission.id },
        status: 'ativo',
      })

      results.push({ mission: mission.titulo, agent: mission.agent_id, status: 'error', error: errorMsg })
    }
  }

  return NextResponse.json({ executadas: results.length, results })
}

function calcularProxima(frequencia: string): string {
  const agora = new Date()
  switch (frequencia) {
    case 'horaria':   agora.setHours(agora.getHours() + 1); break
    case 'diaria':    agora.setDate(agora.getDate() + 1); break
    case 'semanal':   agora.setDate(agora.getDate() + 7); break
    case 'mensal':    agora.setMonth(agora.getMonth() + 1); break
    default:          agora.setDate(agora.getDate() + 1)
  }
  return agora.toISOString()
}
