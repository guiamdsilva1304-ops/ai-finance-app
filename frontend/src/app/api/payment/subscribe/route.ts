import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = 'https://imoney.ia.br'

export async function POST(req: NextRequest) {
  try {
    const { user_id, email, periodo = 'mensal' } = await req.json()
    if (!user_id || !email)
      return NextResponse.json({ error: 'user_id e email obrigatorios' }, { status: 400 })

    const MP_TOKEN = process.env.MP_ACCESS_TOKEN
    if (!MP_TOKEN) {
      return NextResponse.json({ error: 'Pagamento temporariamente indisponivel' }, { status: 503 })
    }

    const amount = periodo === 'anual' ? 23.90 : 29.90

    console.log('[MP] Criando plano para:', email, 'amount:', amount)

    const planRes = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify({
        reason: 'iMoney Pro — Assessor Financeiro com IA',
        external_reference: user_id,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: 'BRL',
        },
        payment_methods_allowed: {
          payment_types: [{ id: 'credit_card' }],
        },
        back_url: `${BASE_URL}/dashboard?payment=success`,
        notification_url: `${BASE_URL}/api/payment/webhook`,
      }),
    })

    const planData = await planRes.json()
    console.log('[MP] Plan response status:', planRes.status)
    console.log('[MP] Plan response:', JSON.stringify(planData))

    if (!planRes.ok) {
      const errMsg = planData?.message ?? planData?.error ?? JSON.stringify(planData)
      throw new Error('MP API erro: ' + errMsg)
    }

    const checkout_url = planData.init_point
    if (!checkout_url) {
      throw new Error('init_point nao retornado: ' + JSON.stringify(planData))
    }

    // Salva assinatura pendente
    await supabase.from('subscriptions').upsert({
      user_id,
      mp_plan_id: planData.id,
      status: 'pending',
      plan: 'pro',
      amount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return NextResponse.json({ checkout_url, plan_id: planData.id })

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[/api/payment/subscribe]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
