import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MP_TOKEN = process.env.MP_ACCESS_TOKEN!
const BASE_URL = 'https://imoney.ia.br'

export async function POST(req: NextRequest) {
  try {
    const { user_id, email } = await req.json()
    if (!user_id || !email)
      return NextResponse.json({ error: 'user_id e email obrigatórios' }, { status: 400 })

    // Cria plano no MP se não existir ainda
    // (na prática, você cria o plano uma vez e salva o ID)
    const planRes = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify({
        reason: 'iMoney Pro — Assessor Financeiro com IA',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 29.90,
          currency_id: 'BRL',
        },
        payment_methods_allowed: {
          payment_types: [{ id: 'credit_card' }],
        },
        back_url: `${BASE_URL}/dashboard?payment=success`,
      }),
    })

    const plan = await planRes.json()
    console.log('[MP] Plan:', JSON.stringify(plan))

    if (!planRes.ok) throw new Error('Erro ao criar plano: ' + JSON.stringify(plan))

    // Cria assinatura pendente no Supabase
    const { error: dbError } = await supabase.from('subscriptions').upsert({
      user_id,
      mp_plan_id: plan.id,
      status: 'pending',
      plan: 'pro',
      amount: 29.90,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (dbError) throw dbError

    // Retorna o init_point para redirecionar o usuário
    return NextResponse.json({
      checkout_url: plan.init_point,
      plan_id: plan.id,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/payment/subscribe]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
