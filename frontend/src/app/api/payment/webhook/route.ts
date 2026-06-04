import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)
const MP_TOKEN = process.env.MP_ACCESS_TOKEN!

async function getPreapproval(id: string) {
  const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
  })
  return res.json()
}

async function ativarPro(user_id: string, mp_preapproval_id: string, next_payment_date: string) {
  await supabase.from('subscriptions').upsert({
    user_id,
    mp_preapproval_id,
    status: 'active',
    plan: 'pro',
    amount: 14.90,
    next_payment_date,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  await supabase.from('user_profiles').update({
    plan: 'pro',
    plan_expires_at: next_payment_date,
  }).or(`id.eq.${user_id},user_id.eq.${user_id}`)
}

async function ativarPremium(user_id: string, mp_preapproval_id: string, next_payment_date: string) {
  await supabase.from('subscriptions').upsert({
    user_id,
    mp_preapproval_id,
    status: 'active',
    plan: 'premium',
    amount: 39.90,
    next_payment_date,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  await supabase.from('user_profiles').update({
    plan: 'premium',
    premium_expires_at: next_payment_date,
  }).or(`id.eq.${user_id},user_id.eq.${user_id}`)
}

async function cancelarPlano(user_id: string, mp_preapproval_id: string) {
  await supabase.from('subscriptions').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('mp_preapproval_id', mp_preapproval_id)

  await supabase.from('user_profiles').update({
    plan: 'free',
    plan_expires_at: null,
    premium_expires_at: null,
  }).or(`id.eq.${user_id},user_id.eq.${user_id}`)
}

// Mantém para compatibilidade retroativa
async function cancelarPro(user_id: string, mp_preapproval_id: string) {
  return cancelarPlano(user_id, mp_preapproval_id)
}

async function enviarEmailBoasVindas(email: string) {
  await resend.emails.send({
    from: 'Gui da iMoney <gui@imoney.ia.br>',
    to: email,
    subject: 'Bem-vindo ao iMoney Pro! 🧭',
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:40px 32px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;font-size:28px;font-weight:900;margin:0 0 8px;">Você é Pro agora! 🎉</h1>
          <p style="color:#9FE1CB;font-size:16px;margin:0;">Sua bússola financeira completa com IA</p>
        </div>
        <div style="padding:32px;">
          <p style="font-size:16px;color:#1a1a1a;line-height:1.6;">Oi! Seja bem-vindo ao iMoney Pro.</p>
          <p style="font-size:15px;color:#444;line-height:1.7;">
            A partir de agora você tem acesso ilimitado ao Assessor IA, metas ilimitadas,
            controle de investimentos e muito mais. Tudo para você tomar decisões financeiras
            melhores todo dia.
          </p>
          <div style="background:#f0faf6;border-radius:12px;padding:20px;margin:24px 0;">
            <p style="font-size:14px;font-weight:700;color:#085041;margin:0 0 12px;">O que você tem agora:</p>
            ${[
              'Assessor IA ilimitado',
              'Metas financeiras ilimitadas',
              'Controle de investimentos',
              'Análise de renda e gastos',
              'Relatórios mensais automáticos',
            ].map(f => `<p style="font-size:14px;color:#1D9E75;margin:6px 0;">✓ ${f}</p>`).join('')}
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://imoney.ia.br/dashboard/assessor"
              style="background:#1D9E75;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">
              Abrir o Assessor IA →
            </a>
          </div>
          <p style="font-size:13px;color:#888;line-height:1.6;">
            Qualquer dúvida, responde esse email. Sou o Gui, fundador da iMoney.
            Quero muito saber como posso te ajudar a organizar suas finanças.
          </p>
        </div>
        <div style="background:#f8f9f8;padding:20px 32px;text-align:center;border-radius:0 0 12px 12px;">
          <p style="font-size:12px;color:#aaa;margin:0;">
            iMoney · <a href="https://imoney.ia.br" style="color:#1D9E75;">imoney.ia.br</a>
            · Para cancelar, acesse seu perfil no app
          </p>
        </div>
      </div>
    `,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[MP Webhook]', JSON.stringify(body))

    const { type, data } = body

    // MP envia notificação de pagamento recorrente
    if (type === 'subscription_preapproval' && data?.id) {
      const preapproval = await getPreapproval(data.id)
      console.log('[MP Preapproval]', JSON.stringify(preapproval))

      const external_reference = preapproval.external_reference
      if (!external_reference) {
        console.error('[Webhook] Sem external_reference')
        return NextResponse.json({ ok: true })
      }

      const user_id = external_reference

      if (preapproval.status === 'authorized') {
        const { data: userData } = await supabase.auth.admin.getUserById(user_id)
        const email = userData?.user?.email

        // Descobre qual plano está pendente para esse usuário
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        const planoPendente = sub?.plan ?? 'pro'

        if (planoPendente === 'premium') {
          await ativarPremium(user_id, preapproval.id, preapproval.next_payment_date)
          console.log('[Webhook] Premium ativado para:', user_id)
        } else {
          await ativarPro(user_id, preapproval.id, preapproval.next_payment_date)
          console.log('[Webhook] Pro ativado para:', user_id)
        }

        if (email) {
          await enviarEmailBoasVindas(email).catch(e => console.error('Email erro:', e))
        }
      }

      if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
        await cancelarPlano(user_id, preapproval.id)
        console.log('[Webhook] Plano cancelado para:', user_id)
      }
    }

    // Notificação de pagamento individual
    if (type === 'payment' && data?.id) {
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
      })
      const payment = await paymentRes.json()
      console.log('[MP Payment]', JSON.stringify(payment))

      if (payment.status === 'approved' && payment.external_reference) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id, status')
          .eq('user_id', payment.external_reference)
          .single()

        if (sub && sub.status !== 'active') {
          const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id)
          const email = userData?.user?.email
          await ativarPro(sub.user_id, payment.preapproval_id, payment.date_approved)
          if (email) await enviarEmailBoasVindas(email).catch(() => null)
        }
      }
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Webhook Error]', msg)
    // Sempre retorna 200 para o MP não reenviar
    return NextResponse.json({ ok: true })
  }
}

// MP faz GET para verificar o endpoint
export async function GET() {
  return NextResponse.json({ status: 'iMoney webhook ativo' })
}
