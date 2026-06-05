import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'Gui da iMoney <gui@imoney.ia.br>'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date().toISOString().split('T')[0]

  // Usuários com streak >= 5 que não registraram transação hoje e ainda não receberam alerta hoje
  const { data: emRisco, error } = await supabase
    .from('user_profiles')
    .select('user_id, control_streak_days, control_streak_last_date, streak_alert_sent_date')
    .gte('control_streak_days', 5)
    .lt('control_streak_last_date', hoje)
    .or(`streak_alert_sent_date.is.null,streak_alert_sent_date.lt.${hoje}`)

  if (error) {
    console.error('[streak-alert] Erro ao buscar usuários:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!emRisco?.length) {
    return NextResponse.json({ enviados: 0, msg: 'Nenhum usuário em risco' })
  }

  let enviados = 0
  const erros: string[] = []

  for (const perfil of emRisco) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(perfil.user_id)
      const email = authUser?.user?.email
      if (!email) continue

      const dias = perfil.control_streak_days as number

      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `Sua sequência de ${dias} dias está em risco 🔥`,
        html: buildEmail(dias),
      })

      await supabase
        .from('user_profiles')
        .update({ streak_alert_sent_date: hoje })
        .eq('user_id', perfil.user_id)

      enviados++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      erros.push(`${perfil.user_id}: ${msg}`)
    }
  }

  console.log(`[streak-alert] Enviados: ${enviados}, Erros: ${erros.length}`)
  return NextResponse.json({ enviados, erros })
}

export async function GET(req: NextRequest) {
  return POST(req)
}

function buildEmail(dias: number): string {
  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4f5e9;">
      <div style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:32px 28px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">🔥</div>
        <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 6px;">
          ${dias} dias seguidos em risco!
        </h1>
        <p style="color:#9FE1CB;font-size:14px;margin:0;">
          Você ainda não registrou nenhuma transação hoje
        </p>
      </div>

      <div style="padding:28px;">
        <p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">
          Ei! Você construiu uma sequência incrível de <strong>${dias} dias</strong> registrando suas finanças.
          Não deixe ela quebrar agora — falta só um registro hoje para manter o fogo aceso.
        </p>

        <div style="background:#fff8f0;border:1.5px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
          <p style="font-size:14px;color:#92400e;font-weight:700;margin:0 0 6px;">Como manter sua sequência:</p>
          <p style="font-size:13px;color:#78350f;margin:0;line-height:1.6;">
            Registre qualquer transação de hoje — um café, uma conta, qualquer coisa.
            Isso já conta para manter os <strong>${dias} dias</strong> vivos.
          </p>
        </div>

        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://imoney.ia.br/dashboard/transacoes"
            style="background:#1D9E75;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
            Registrar transação agora →
          </a>
        </div>

        <p style="font-size:13px;color:#888;line-height:1.6;margin:0;">
          Sou o Gui, fundador da iMoney. Quem registra regularmente economiza
          em média 18% mais do que quem não registra. Você já provou que consegue — continue!
        </p>
      </div>

      <div style="background:#f8f9f8;padding:16px 28px;text-align:center;border-top:1px solid #e4f5e9;">
        <p style="font-size:12px;color:#aaa;margin:0;">
          iMoney · <a href="https://imoney.ia.br" style="color:#1D9E75;">imoney.ia.br</a>
        </p>
      </div>
    </div>
  `
}
