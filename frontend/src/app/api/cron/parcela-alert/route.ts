import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'Gui da iMoney <gui@imoney.ia.br>'

// Offsets to alert before due date (days)
const ALERT_OFFSETS: { days: number; label: string; urgency: 'low' | 'medium' | 'high' | 'urgent' }[] = [
  { days: 7, label: 'em 7 dias',  urgency: 'low' },
  { days: 3, label: 'em 3 dias',  urgency: 'medium' },
  { days: 1, label: 'amanhã',     urgency: 'high' },
  { days: 0, label: 'hoje',       urgency: 'urgent' },
]

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateBR(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function buildAlertEmail(params: {
  nome: string
  descricao: string
  valor: number
  dueDate: string
  parcelaNum: number
  parcelaTotal: number
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  label: string
}): { subject: string; html: string } {
  const { nome, descricao, valor, dueDate, parcelaNum, parcelaTotal, urgency, label } = params

  const emoji = urgency === 'urgent' ? '🚨' : urgency === 'high' ? '⏰' : urgency === 'medium' ? '📅' : '💳'
  const urgencyColor = urgency === 'urgent' ? '#dc2626' : urgency === 'high' ? '#ea580c' : urgency === 'medium' ? '#d97706' : '#1D9E75'
  const urgencyBg = urgency === 'urgent' ? '#fef2f2' : urgency === 'high' ? '#fff7ed' : urgency === 'medium' ? '#fffbeb' : '#f0fdf4'
  const urgencyBorder = urgency === 'urgent' ? '#fca5a5' : urgency === 'high' ? '#fdba74' : urgency === 'medium' ? '#fcd34d' : '#86efac'

  const subject = urgency === 'urgent'
    ? `${emoji} Parcela vence HOJE — ${descricao} (${formatBRL(valor)})`
    : `${emoji} Parcela vence ${label} — ${descricao} (${formatBRL(valor)})`

  const headline =
    urgency === 'urgent' ? 'Parcela vence hoje!' :
    urgency === 'high'   ? 'Parcela vence amanhã!' :
    urgency === 'medium' ? 'Parcela em 3 dias' :
                           'Lembrete de parcela'

  const message =
    urgency === 'urgent'
      ? `Oi${nome ? ` ${nome}` : ''}! Sua parcela <strong>${parcelaNum} de ${parcelaTotal}</strong> de <strong>${descricao}</strong> vence <strong>hoje</strong>. Certifique-se de que o pagamento está em dia para evitar juros.`
      : urgency === 'high'
      ? `Oi${nome ? ` ${nome}` : ''}! Amanhã vence a parcela <strong>${parcelaNum} de ${parcelaTotal}</strong> de <strong>${descricao}</strong>. Deixe o saldo separado para não ser pego de surpresa.`
      : urgency === 'medium'
      ? `Oi${nome ? ` ${nome}` : ''}! Em 3 dias vence a parcela <strong>${parcelaNum} de ${parcelaTotal}</strong> de <strong>${descricao}</strong>. Aproveite para verificar seu saldo e garantir que vai ter o valor disponível.`
      : `Oi${nome ? ` ${nome}` : ''}! Em 7 dias vence a parcela <strong>${parcelaNum} de ${parcelaTotal}</strong> de <strong>${descricao}</strong>. Anote no calendário para não esquecer.`

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Nunito,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <tr>
        <td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:28px 32px;text-align:center">
          <span style="color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px">iMoney</span>
          <p style="color:#dcfce7;font-size:13px;margin:4px 0 0;font-weight:600">Seu assessor financeiro com IA</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:48px">${emoji}</span>
          </div>
          <h1 style="color:#14532d;font-size:20px;font-weight:800;margin:0 0 8px;line-height:1.3;text-align:center">${headline}</h1>
          <p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 24px">${message}</p>

          <div style="background:${urgencyBg};border:2px solid ${urgencyBorder};border-radius:16px;padding:24px;margin-bottom:28px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:12px">
                  <span style="font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em">Descrição</span><br>
                  <span style="font-size:17px;font-weight:800;color:#0d2414">${descricao}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px">
                  <span style="font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em">Valor da parcela</span><br>
                  <span style="font-size:28px;font-weight:900;color:${urgencyColor}">${formatBRL(valor)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px">
                  <span style="font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em">Vencimento</span><br>
                  <span style="font-size:15px;font-weight:700;color:#374151">${formatDateBR(dueDate)}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span style="font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em">Parcela</span><br>
                  <span style="font-size:15px;font-weight:700;color:#374151">${parcelaNum} de ${parcelaTotal}</span>
                  <span style="font-size:12px;color:#9ca3af;margin-left:8px">(faltam ${parcelaTotal - parcelaNum + 1} parcela${parcelaTotal - parcelaNum + 1 !== 1 ? 's' : ''} incluindo esta)</span>
                </td>
              </tr>
            </table>
          </div>

          <div style="margin:0 0 32px;text-align:center">
            <a href="https://imoney.ia.br/dashboard/transacoes"
              style="background:#1D9E75;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:800;font-size:15px;display:inline-block">
              Ver meus parcelamentos →
            </a>
          </div>

          <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0;text-align:center">
            Dica: o iMoney acompanha todas as suas parcelas automaticamente para você nunca perder um pagamento.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 24px;border-top:1px solid #f0fdf4;text-align:center">
          <p style="color:#9ca3af;font-size:12px;margin:0">Você recebe este email por ter parcelamentos registrados no iMoney.<br>
          © 2026 iMoney · Feito com amor no Brasil</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  return { subject, html }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET ?? process.env.imoneycronsecret2026
  const auth = req.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  let enviados = 0
  let pulados = 0
  const erros: string[] = []

  for (const offset of ALERT_OFFSETS) {
    const targetDate = addDays(today, offset.days)
    const alertType = `parcela_${offset.days}d`

    // Fetch all parcelamento transactions due on targetDate
    const { data: parcelas, error: parcErr } = await supabaseAdmin
      .from('transactions')
      .select('id, user_id, descricao, valor, date, parcela_numero, parcela_total')
      .eq('date', targetDate)
      .not('parcelamento_id', 'is', null)

    if (parcErr) {
      erros.push(`Erro ao buscar parcelas para ${targetDate}: ${parcErr.message}`)
      continue
    }
    if (!parcelas?.length) continue

    for (const tx of parcelas) {
      try {
        // Dedup: skip if already sent this alert type for this transaction
        const { data: existing } = await supabaseAdmin
          .from('email_queue')
          .select('id')
          .eq('user_id', tx.user_id)
          .eq('type', alertType)
          .filter('metadata->>transaction_id', 'eq', tx.id)
          .maybeSingle()

        if (existing) {
          pulados++
          continue
        }

        // Get user email and name
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(tx.user_id)
        const email = authUser?.user?.email
        if (!email) continue

        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('nome')
          .eq('user_id', tx.user_id)
          .maybeSingle()
        const nome = profile?.nome ?? email.split('@')[0]

        const { subject, html } = buildAlertEmail({
          nome,
          descricao: tx.descricao,
          valor: Number(tx.valor),
          dueDate: tx.date,
          parcelaNum: tx.parcela_numero ?? 1,
          parcelaTotal: tx.parcela_total ?? 1,
          urgency: offset.urgency,
          label: offset.label,
        })

        await resend.emails.send({ from: FROM, to: email, subject, html })

        // Record in email_queue to prevent duplicates
        await supabaseAdmin.from('email_queue').insert({
          user_id: tx.user_id,
          email,
          type: alertType,
          status: 'enviado',
          sent_at: new Date().toISOString(),
          scheduled_for: new Date().toISOString(),
          metadata: { transaction_id: tx.id, due_date: tx.date, valor: tx.valor },
        })

        enviados++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        erros.push(`tx ${tx.id}: ${msg}`)
      }
    }
  }

  console.log(`[PARCELA-ALERT] enviados=${enviados} pulados=${pulados} erros=${erros.length}`)
  return NextResponse.json({ ok: true, enviados, pulados, erros })
}
