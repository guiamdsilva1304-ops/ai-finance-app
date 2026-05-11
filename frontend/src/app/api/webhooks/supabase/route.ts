import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  const expected = process.env.WEBHOOK_SECRET ?? 'imoney-webhook-secret-2025'

  if (secret !== expected) {
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
        scheduled_at: now.toISOString(),
        sent: false,
      },
      {
        user_id: userId,
        email,
        type: 'onboarding_day3',
        scheduled_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        sent: false,
      },
      {
        user_id: userId,
        email,
        type: 'onboarding_day7',
        scheduled_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        sent: false,
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
