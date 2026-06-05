import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { checkSumiu, checkMetaOrfa, checkFreeEngajado, checkQuaseLa, TriggerResult } from '@/lib/reactivation/triggers'
import { sumiuEmail1, sumiuEmail2, sumiuEmail3 } from '@/lib/emails/reactivation/sumiu'
import { metaOrfaEmail1, metaOrfaEmail2 } from '@/lib/emails/reactivation/meta-orfa'
import { freeEngajadoEmail1, freeEngajadoEmail2 } from '@/lib/emails/reactivation/free-engajado'
import { quaseLaEmail1 } from '@/lib/emails/reactivation/quase-la'
import type { EmailResult } from '@/lib/emails/reactivation/_base'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FROM = 'Gui da iMoney <gui@imoney.ia.br>'

type TrailSlug = 'sumiu' | 'meta-orfa' | 'free-engajado' | 'quase-la'

// Days from campaign.started_at when each email number should be sent (0-indexed)
const TRAIL_OFFSETS: Record<TrailSlug, number[]> = {
  'sumiu':           [0, 7, 14],
  'meta-orfa':       [0, 5],
  'free-engajado':   [0, 3],
  'quase-la':        [0],
}

// Priority order for trigger evaluation (highest first)
const TRAIL_PRIORITY: TrailSlug[] = ['quase-la', 'free-engajado', 'meta-orfa', 'sumiu']

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)

// ─── Email builders per trail ────────────────────────────────────────────────

function buildEmail(
  trail: TrailSlug,
  emailNumber: number,
  params: { nome: string; userId: string } & TriggerResult,
): EmailResult | null {
  const p = {
    nome: params.nome,
    userId: params.userId,
    metaPrincipal: params.metaNome,
    valorFaltante: params.valorFaltante,
  }
  if (trail === 'sumiu') {
    return emailNumber === 1 ? sumiuEmail1(p)
      : emailNumber === 2 ? sumiuEmail2(p)
      : emailNumber === 3 ? sumiuEmail3(p)
      : null
  }
  if (trail === 'meta-orfa') {
    return emailNumber === 1 ? metaOrfaEmail1(p)
      : emailNumber === 2 ? metaOrfaEmail2(p)
      : null
  }
  if (trail === 'free-engajado') {
    return emailNumber === 1 ? freeEngajadoEmail1(p)
      : emailNumber === 2 ? freeEngajadoEmail2(p)
      : null
  }
  if (trail === 'quase-la') {
    return emailNumber === 1 ? quaseLaEmail1(p) : null
  }
  return null
}

// ─── Exit condition check ────────────────────────────────────────────────────

async function checkExitCondition(trail: TrailSlug, userId: string, startedAt: string): Promise<string | null> {
  if (trail === 'sumiu') {
    const { data } = await supabase.auth.admin.getUserById(userId)
    const lastSignIn = data?.user?.last_sign_in_at
    if (lastSignIn && new Date(lastSignIn) > new Date(startedAt)) return 'user_logged_in'
  }

  if (trail === 'meta-orfa') {
    const campaignDate = new Date(startedAt).toISOString().split('T')[0]
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', campaignDate)
    if ((count ?? 0) > 0) return 'first_transaction_recorded'
  }

  if (trail === 'free-engajado') {
    const { data } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.plan === 'pro') return 'user_upgraded_to_pro'
  }

  if (trail === 'quase-la') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo)
    if ((count ?? 0) > 0) return 'new_transaction_recorded'
  }

  return null
}

// ─── Send and log helper ─────────────────────────────────────────────────────

async function sendReactivationEmail(opts: {
  userId: string
  email: string
  campaignId: string
  trail: TrailSlug
  emailNumber: number
  template: EmailResult
}): Promise<void> {
  const { userId, email, campaignId, trail, emailNumber, template } = opts
  const now = new Date().toISOString()

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  })

  await Promise.all([
    supabase.from('reactivation_email_log').insert({
      campaign_id: campaignId,
      email_number: emailNumber,
      sent_at: now,
    }),
    supabase.from('email_queue').insert({
      user_id: userId,
      email,
      type: `reactivation_${trail}_${emailNumber}`,
      tipo: `reactivation_${trail}_${emailNumber}`,
      subject: template.subject,
      scheduled_for: now,
      sent_at: now,
      status: 'enviado',
    }),
  ])
}

// ─── Phase 1: advance or exit existing campaigns ─────────────────────────────

async function advanceActiveCampaigns(): Promise<{ advanced: number; exited: number }> {
  const { data: campaigns } = await supabase
    .from('reactivation_campaigns')
    .select('id, user_id, trilha_slug, started_at')
    .eq('status', 'active')

  if (!campaigns?.length) return { advanced: 0, exited: 0 }

  let advanced = 0
  let exited = 0

  for (const campaign of campaigns) {
    const trail = campaign.trilha_slug as TrailSlug
    const userId: string = campaign.user_id

    const exitReason = await checkExitCondition(trail, userId, campaign.started_at)
    if (exitReason) {
      await supabase
        .from('reactivation_campaigns')
        .update({ status: 'exited', completed_at: new Date().toISOString(), exit_reason: exitReason })
        .eq('id', campaign.id)
      exited++
      continue
    }

    const { data: logs } = await supabase
      .from('reactivation_email_log')
      .select('email_number')
      .eq('campaign_id', campaign.id)
      .order('email_number', { ascending: false })

    const lastEmailNumber = logs?.[0]?.email_number ?? 0
    const offsets = TRAIL_OFFSETS[trail]
    const nextEmailNumber = lastEmailNumber + 1

    if (nextEmailNumber > offsets.length) {
      await supabase
        .from('reactivation_campaigns')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', campaign.id)
      continue
    }

    const nextOffset = offsets[nextEmailNumber - 1]
    const dueAt = new Date(new Date(campaign.started_at).getTime() + nextOffset * 86400000)
    if (new Date() < dueAt) continue

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('nome_preferido, nome, email')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    const email: string = profile?.email ?? authUser?.user?.email ?? ''
    if (!email) continue

    const nome: string = profile?.nome_preferido ?? profile?.nome ?? email.split('@')[0]

    const template = buildEmail(trail, nextEmailNumber, { nome, userId, eligible: true })
    if (!template) continue

    try {
      await sendReactivationEmail({ userId, email, campaignId: campaign.id, trail, emailNumber: nextEmailNumber, template })
      advanced++
    } catch (err) {
      console.error(`[reactivation] Error sending ${trail} email ${nextEmailNumber} to ${email}:`, err)
    }
  }

  return { advanced, exited }
}

// ─── Phase 2: enroll new users in eligible trails ────────────────────────────

async function enrollNewCampaigns(): Promise<{ enrolled: number }> {
  const { data: activeRows } = await supabase
    .from('reactivation_campaigns')
    .select('user_id')
    .eq('status', 'active')

  const activeUserIds = new Set<string>((activeRows ?? []).map((r: { user_id: string }) => r.user_id))

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, nome_preferido, nome, email')

  if (!profiles?.length) return { enrolled: 0 }

  let enrolled = 0

  for (const profile of profiles as { user_id: string; nome_preferido: string | null; nome: string | null; email: string | null }[]) {
    if (activeUserIds.has(profile.user_id)) continue

    const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id)
    const email: string = profile.email ?? authUser?.user?.email ?? ''
    if (!email) continue

    const nome: string = profile.nome_preferido ?? profile.nome ?? email.split('@')[0]

    // Evaluate triggers in priority order (highest first)
    let matched: { trail: TrailSlug; result: TriggerResult } | null = null
    for (const trail of TRAIL_PRIORITY) {
      let result: TriggerResult
      if (trail === 'quase-la')       result = await checkQuaseLa(supabase, profile.user_id)
      else if (trail === 'free-engajado') result = await checkFreeEngajado(supabase, profile.user_id)
      else if (trail === 'meta-orfa')  result = await checkMetaOrfa(supabase, profile.user_id)
      else                             result = await checkSumiu(supabase, profile.user_id)
      if (result.eligible) { matched = { trail, result }; break }
    }

    if (!matched) continue

    const { data: campaign, error: insertErr } = await supabase
      .from('reactivation_campaigns')
      .insert({ user_id: profile.user_id, trilha_slug: matched.trail, status: 'active' })
      .select('id')
      .single()

    if (insertErr || !campaign) continue

    const template = buildEmail(matched.trail, 1, { nome, userId: profile.user_id, ...matched.result })
    if (!template) continue

    try {
      await sendReactivationEmail({
        userId: profile.user_id,
        email,
        campaignId: campaign.id,
        trail: matched.trail,
        emailNumber: 1,
        template,
      })
      enrolled++
    } catch (err) {
      console.error(`[reactivation] Error sending first email for ${matched.trail} to ${email}:`, err)
      await supabase
        .from('reactivation_campaigns')
        .update({ status: 'exited', exit_reason: 'email_send_failed' })
        .eq('id', campaign.id)
    }
  }

  return { enrolled }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET ?? process.env.imoneycronsecret2026
  const auth = req.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [phase1, phase2] = await Promise.all([
      advanceActiveCampaigns(),
      enrollNewCampaigns(),
    ])

    return NextResponse.json({
      ok: true,
      advanced: phase1.advanced,
      exited: phase1.exited,
      enrolled: phase2.enrolled,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/reactivation]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
