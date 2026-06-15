import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const esperado = process.env.CRON_SECRET ?? process.env.imoneycronsecret2026
  return !!esperado && secret === esperado
}

// Rebaixa para 'free' quem teve o trial Premium de 7 dias (concedido no cadastro)
// e não converteu em assinatura paga. Assinantes ativos (Mercado Pago) nunca
// são afetados, mesmo que premium_expires_at esteja no passado.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const agora = new Date().toISOString()

  const { data: candidatos, error: erroCandidatos } = await supabase
    .from('user_profiles')
    .select('user_id, premium_expires_at')
    .eq('plan', 'premium')
    .lt('premium_expires_at', agora)

  if (erroCandidatos) {
    console.error('[trial-expirado] erro ao buscar candidatos:', erroCandidatos)
    return NextResponse.json({ error: erroCandidatos.message }, { status: 500 })
  }

  if (!candidatos?.length) {
    return NextResponse.json({ rebaixados: 0, msg: 'Nenhum trial vencido' })
  }

  const { data: assinantesAtivos, error: erroAssinaturas } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')

  if (erroAssinaturas) {
    console.error('[trial-expirado] erro ao buscar assinaturas:', erroAssinaturas)
    return NextResponse.json({ error: erroAssinaturas.message }, { status: 500 })
  }

  const idsAssinantes = new Set((assinantesAtivos ?? []).map(a => a.user_id))
  const idsParaRebaixar = candidatos
    .map(c => c.user_id)
    .filter(id => !idsAssinantes.has(id))

  if (!idsParaRebaixar.length) {
    return NextResponse.json({ rebaixados: 0, msg: 'Trials vencidos pertencem a assinantes ativos' })
  }

  const { error: erroUpdate } = await supabase
    .from('user_profiles')
    .update({ plan: 'free', premium_expires_at: null, updated_at: agora })
    .in('user_id', idsParaRebaixar)

  if (erroUpdate) {
    console.error('[trial-expirado] erro ao rebaixar:', erroUpdate)
    return NextResponse.json({ error: erroUpdate.message }, { status: 500 })
  }

  return NextResponse.json({ rebaixados: idsParaRebaixar.length, user_ids: idsParaRebaixar })
}

// GET: para o cron do Vercel, que chama por GET
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  return POST(req)
}
