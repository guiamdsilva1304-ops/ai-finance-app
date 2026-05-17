import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'Gui da iMoney <gui@imoney.ia.br>'

const WELCOME_HTML = () =>
  `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:40px 32px;text-align:center;border-radius:12px 12px 0 0"><h1 style="color:#fff;font-size:26px;font-weight:900;margin:0 0 8px">Oi! Bem-vindo à iMoney 👋</h1><p style="color:#9FE1CB;font-size:15px;margin:0">Sua bússola financeira pessoal com IA</p></div><div style="padding:32px;background:#fff"><p style="font-size:16px;color:#1a1a1a;line-height:1.7">Fico feliz que você chegou até aqui. Sou o Gui, fundador da iMoney.</p><p style="font-size:15px;color:#444;line-height:1.7">A iMoney nasceu porque eu queria algo que <strong>entendesse minha situação e me dissesse o que fazer</strong> — não só gráficos bonitos.</p><div style="text-align:center;margin:28px 0"><a href="https://imoney.ia.br/dashboard/assessor" style="background:#1D9E75;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Conversar com o Assessor →</a></div><p style="font-size:13px;color:#888">Responde esse email com qualquer dúvida. Eu leio tudo.</p><p style="font-size:14px;color:#1a1a1a;font-weight:600">Gui<br><span style="font-weight:400;color:#888">Fundador da iMoney</span></p></div></div>`

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ ok: false, reason: 'no_token' })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user?.email) return NextResponse.json({ ok: false, reason: 'invalid_token' })

    // Só envia para usuários criados nos últimos 3 dias
    const diasDesdeCadastro = (Date.now() - new Date(user.created_at).getTime()) / 86400000
    if (diasDesdeCadastro > 3) return NextResponse.json({ ok: false, reason: 'not_new_user' })

    // Verifica se o email de boas-vindas já foi enviado
    const { data: jaEnviou } = await supabase
      .from('email_queue')
      .select('id')
      .eq('user_id', user.id)
      .eq('tipo', 'onboarding_dia_0')
      .maybeSingle()

    if (jaEnviou) return NextResponse.json({ ok: true, reason: 'already_sent' })

    const now = new Date().toISOString()

    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: 'Bem-vindo à iMoney 🧭 — sua bússola financeira com IA',
      html: WELCOME_HTML(),
    })

    await supabase.from('email_queue').insert({
      user_id: user.id,
      email: user.email,
      type: 'onboarding_dia_0',
      tipo: 'onboarding_dia_0',
      subject: 'Bem-vindo à iMoney 🧭 — sua bússola financeira com IA',
      scheduled_for: now,
      sent_at: now,
      status: 'enviado',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[onboarding/welcome]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
