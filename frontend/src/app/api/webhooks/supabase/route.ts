import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  const expected = process.env.WEBHOOK_SECRET

  // Fail-closed: sem o segredo configurado, rejeita todas as requisições.
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    if (body.type !== 'INSERT' || body.table !== 'users') {
      return NextResponse.json({ ok: true })
    }

    const record = body.record
    const email = record?.email
    const userId = record?.id

    if (!email || !userId) {
      return NextResponse.json({ ok: true })
    }

    // Evita duplicata se o outro trigger (welcome_email) já enfileirou
    const { data: existing } = await supabase
      .from('email_queue')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'welcome')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ ok: true, msg: 'already_queued' })
    }

    const now = new Date()
    const { error } = await supabase.from('email_queue').insert([
      {
        user_id: userId,
        email,
        type: 'welcome',
        scheduled_for: now.toISOString(),
      },
      {
        user_id: userId,
        email,
        type: 'onboarding_day3',
        scheduled_for: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: userId,
        email,
        type: 'onboarding_day7',
        scheduled_for: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ])

    if (error) throw error

    console.log('[WEBHOOK SUPABASE] Onboarding enfileirado para:', email)
    return NextResponse.json({ ok: true, queued: 3 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[WEBHOOK SUPABASE]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
