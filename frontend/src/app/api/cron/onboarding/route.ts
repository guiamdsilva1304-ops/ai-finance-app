import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'Gui da iMoney <gui@imoney.ia.br>'

// Dia 0 (boas-vindas) é disparado via /api/onboarding/welcome no primeiro acesso ao dashboard
const SEQUENCIA = [
  {
    dia: 2,
    assunto: 'Você sabe quanto gasta por mês? 🤔',
    html: () => `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#1D9E75;padding:32px;text-align:center;border-radius:12px 12px 0 0"><h1 style="color:#fff;font-size:24px;font-weight:900;margin:0">Você sabe quanto gasta por mês?</h1></div><div style="padding:32px;background:#fff"><p style="font-size:15px;color:#444;line-height:1.7">A maioria das pessoas acha que sabe — mas quando soma tudo, fica surpresa.</p><div style="background:#f0faf6;border-radius:12px;padding:20px;margin:20px 0"><p style="font-size:14px;font-weight:700;color:#085041;margin:0 0 12px">3 perguntas que o Assessor IA responde pra você:</p><p style="font-size:14px;color:#1D9E75;margin:8px 0">→ Em que categoria eu gasto mais?</p><p style="font-size:14px;color:#1D9E75;margin:8px 0">→ Quanto sobra no fim do mês de verdade?</p><p style="font-size:14px;color:#1D9E75;margin:8px 0">→ Se eu cortar X, quanto economizo em 1 ano?</p></div><div style="text-align:center;margin:28px 0"><a href="https://imoney.ia.br/dashboard" style="background:#1D9E75;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Ver meu dashboard →</a></div></div></div>`
  },
  {
    dia: 4,
    assunto: 'Reserva de emergência: você tem a sua? 💰',
    html: () => `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#0a3d28;padding:32px;text-align:center;border-radius:12px 12px 0 0"><h1 style="color:#fff;font-size:24px;font-weight:900;margin:0">A reserva que você precisa ter</h1></div><div style="padding:32px;background:#fff"><p style="font-size:15px;color:#444;line-height:1.7">62% dos brasileiros não têm dinheiro guardado para emergências.</p><p style="font-size:15px;color:#444;line-height:1.7"><strong style="color:#1a1a1a">A regra é simples:</strong> 3 a 6 meses dos seus gastos mensais em um CDB liquidez diária ou Tesouro Selic.</p><div style="background:#fff8e6;border-left:4px solid #EF9F27;padding:16px;border-radius:0 8px 8px 0;margin:20px 0"><p style="font-size:14px;color:#633806;margin:0"><strong>Exemplo:</strong> Gasta R$ 3.000/mês? Sua reserva ideal é entre R$ 9.000 e R$ 18.000.</p></div><div style="text-align:center;margin:28px 0"><a href="https://imoney.ia.br/dashboard/metas" style="background:#1D9E75;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Criar meta de reserva →</a></div></div></div>`
  },
  {
    dia: 7,
    assunto: 'Uma semana de iMoney — o que você achou? 🧭',
    html: () => `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:32px;text-align:center;border-radius:12px 12px 0 0"><h1 style="color:#fff;font-size:24px;font-weight:900;margin:0">Uma semana juntos 🙌</h1></div><div style="padding:32px;background:#fff"><p style="font-size:15px;color:#444;line-height:1.7">Faz uma semana que você criou sua conta. Quero saber como foi.</p><div style="background:#f0faf6;border-radius:12px;padding:20px;margin:20px 0;text-align:center"><p style="font-size:14px;color:#085041;margin:0 0 16px;font-weight:700">Experimente perguntar ao Assessor:</p><p style="font-size:13px;color:#1D9E75;margin:6px 0;font-style:italic">"Quanto gastei esse mês em alimentação?"</p><p style="font-size:13px;color:#1D9E75;margin:6px 0;font-style:italic">"Estou no caminho certo para minha meta?"</p><p style="font-size:13px;color:#1D9E75;margin:6px 0;font-style:italic">"Quanto posso investir por mês?"</p></div><div style="text-align:center;margin:28px 0"><a href="https://imoney.ia.br/dashboard/assessor" style="background:#1D9E75;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Abrir o Assessor IA →</a></div><p style="font-size:13px;color:#888">Responde esse email com feedback. Quero muito saber o que posso melhorar.</p></div></div>`
  },
  {
    dia: 10,
    assunto: 'Quer o Assessor IA sem limites? ✨',
    html: () => `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:32px;text-align:center;border-radius:12px 12px 0 0"><h1 style="color:#fff;font-size:24px;font-weight:900;margin:0">Leve sua vida financeira ao próximo nível</h1></div><div style="padding:32px;background:#fff"><p style="font-size:15px;color:#444;line-height:1.7">Você usou a iMoney por 10 dias. O <strong style="color:#1a1a1a">iMoney Pro</strong> dá acesso ilimitado ao Assessor IA e muito mais.</p><div style="background:#f0faf6;border-radius:12px;padding:20px;margin:20px 0"><p style="font-size:14px;color:#1D9E75;margin:8px 0">✓ Assessor IA ilimitado</p><p style="font-size:14px;color:#1D9E75;margin:8px 0">✓ Metas financeiras ilimitadas</p><p style="font-size:14px;color:#1D9E75;margin:8px 0">✓ Controle de investimentos</p><p style="font-size:14px;color:#1D9E75;margin:8px 0">✓ Relatórios mensais automáticos</p></div><div style="text-align:center;margin:28px 0"><a href="https://imoney.ia.br/dashboard/pro" style="background:linear-gradient(135deg,#0a3d28,#1D9E75);color:#fff;padding:16px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">Assinar Pro — R$ 29,90/mês →</a></div><p style="font-size:13px;color:#888;text-align:center">Cancele quando quiser · Garantia de 7 dias</p></div></div>`
  },
]

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.imoneycronsecret2026)
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  try {
    const { data: { users } } = await supabase.auth.admin.listUsers()
    if (!users?.length) return NextResponse.json({ enviados: 0 })

    let enviados = 0

    for (const user of users) {
      if (!user.email) continue
      const diasDesde = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
      const seq = SEQUENCIA.find(s => s.dia === diasDesde)
      if (!seq) continue

      const { data: jaEnviou } = await supabase
        .from('email_queue')
        .select('id')
        .eq('tipo', `onboarding_dia_${seq.dia}`)
        .eq('user_id', user.id)
        .maybeSingle()

      if (jaEnviou) continue

      await resend.emails.send({ from: FROM, to: user.email, subject: seq.assunto, html: seq.html() })

      await supabase.from('email_queue').insert({
        user_id: user.id,
        email: user.email,
        type: `onboarding_dia_${seq.dia}`,
        tipo: `onboarding_dia_${seq.dia}`,
        subject: seq.assunto,
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        status: 'enviado',
      })

      enviados++
    }

    return NextResponse.json({ enviados, total: users.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[cron/onboarding]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
