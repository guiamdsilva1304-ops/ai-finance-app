import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'sk-ant-placeholder' })
const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const { data: proUsers, error: usersError } = await supabase
    .from('user_profiles')
    .select('user_id, nome_preferido, nome, email')
    .in('plan', ['pro', 'premium'])

  if (usersError || !proUsers?.length) {
    return NextResponse.json({ error: 'No pro users found', details: usersError })
  }

  const results = []

  for (const user of proUsers) {
    try {
      const summary = await generateSummaryForUser(user, targetYear, targetMonth)
      results.push({ user_id: user.user_id, status: 'ok', summary_id: summary.id })
    } catch (err: any) {
      results.push({ user_id: user.user_id, status: 'error', error: err.message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

async function generateSummaryForUser(
  user: { user_id: string; nome_preferido: string | null; nome: string | null; email: string },
  year: number,
  month: number
) {
  const startCurrent = new Date(year, month - 1, 1).toISOString()
  const endCurrent = new Date(year, month, 0, 23, 59, 59).toISOString()

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const startPrev = new Date(prevYear, prevMonth - 1, 1).toISOString()
  const endPrev = new Date(prevYear, prevMonth, 0, 23, 59, 59).toISOString()

  const { data: currentTxs } = await supabase
    .from('transactions')
    .select('amount, category, type, description, date')
    .eq('user_id', user.user_id)
    .gte('date', startCurrent)
    .lte('date', endCurrent)

  const { data: prevTxs } = await supabase
    .from('transactions')
    .select('amount, category, type')
    .eq('user_id', user.user_id)
    .gte('date', startPrev)
    .lte('date', endPrev)

  if (!currentTxs?.length) {
    throw new Error('No transactions found for this period')
  }

  const categoryTotals = currentTxs
    .filter(t => t.type === 'expense')
    .reduce((acc: Record<string, number>, t) => {
      const cat = t.category || 'Outros'
      acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
      return acc
    }, {})

  const totalSpent = Object.values(categoryTotals).reduce((a, b) => a + b, 0)
  const totalIncome = currentTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const prevTotalSpent = prevTxs
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

  const diffPercent = prevTotalSpent > 0
    ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100
    : 0

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, total]) => ({ category, total }))

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const monthName = monthNames[month - 1]

  const prompt = `Você é o Assessor Financeiro da iMoney, um app de finanças para jovens brasileiros.

Gere um resumo financeiro mensal para o usuário ${user.nome_preferido || user.nome || 'usuário'} referente a ${monthName}/${year}.

Dados:
- Total gasto: R$ ${totalSpent.toFixed(2)}
- Total recebido: R$ ${totalIncome.toFixed(2)}
- Comparado ao mês anterior: ${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}% nos gastos
- Top categorias de gasto:
${topCategories.map(c => `  • ${c.category}: R$ ${c.total.toFixed(2)}`).join('\n')}

Escreva um resumo em português brasileiro, tom amigável e direto, máximo 4 parágrafos curtos:
1. Visão geral do mês (saldo, se foi positivo ou negativo)
2. Destaques de gasto (categorias principais, sem julgamento)
3. Comparação com mês anterior (o que mudou)
4. Uma dica prática e específica para o próximo mês

Seja humano, não robótico. Use linguagem de jovem adulto, sem ser informal demais.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  })

  const summaryText = response.content[0].type === 'text' ? response.content[0].text : ''

  const { data: saved, error: saveError } = await supabase
    .from('monthly_summaries')
    .upsert({
      user_id: user.user_id,
      year,
      month,
      summary_text: summaryText,
      total_spent: totalSpent,
      total_income: totalIncome,
      top_categories: topCategories,
      vs_previous_month: {
        prev_total: prevTotalSpent,
        diff_percent: parseFloat(diffPercent.toFixed(1))
      }
    }, { onConflict: 'user_id,year,month' })
    .select()
    .single()

  if (saveError) throw saveError

  await sendSummaryEmail(user, saved, monthName, year)

  return saved
}

async function sendSummaryEmail(
  user: { email: string; nome_preferido: string | null; nome: string | null; user_id: string },
  summary: any,
  monthName: string,
  year: number
) {
  const firstName = user.nome_preferido || (user.nome || '').split(' ')[0] || 'você'
  const saldoColor = summary.total_income >= summary.total_spent ? '#00C853' : '#e53935'
  const saldo = summary.total_income - summary.total_spent
  const diffSign = summary.vs_previous_month.diff_percent > 0 ? '+' : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#1a3a1a;padding:28px 32px;text-align:center;">
            <span style="color:#00C853;font-size:22px;font-weight:700;">💰 iMoney</span>
            <p style="color:#a5d6a7;margin:6px 0 0;font-size:13px;">Seu resumo financeiro de ${monthName}/${year}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;font-size:18px;font-weight:600;color:#1a1a1a;">Oi, ${firstName}! 👋</p>
            <p style="margin:8px 0 0;font-size:14px;color:#555;line-height:1.6;">Aqui está seu relatório completo de ${monthName}. Dá uma olhada em como foi o mês.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="32%" style="background:#f9fbe7;border-radius:12px;padding:16px;text-align:center;">
                  <p style="margin:0;font-size:11px;color:#777;text-transform:uppercase;">Receitas</p>
                  <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#2e7d32;">R$ ${summary.total_income.toFixed(2).replace('.', ',')}</p>
                </td>
                <td width="4%"></td>
                <td width="32%" style="background:#fce4ec;border-radius:12px;padding:16px;text-align:center;">
                  <p style="margin:0;font-size:11px;color:#777;text-transform:uppercase;">Gastos</p>
                  <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#c62828;">R$ ${summary.total_spent.toFixed(2).replace('.', ',')}</p>
                </td>
                <td width="4%"></td>
                <td width="32%" style="background:#e8f5e9;border-radius:12px;padding:16px;text-align:center;">
                  <p style="margin:0;font-size:11px;color:#777;text-transform:uppercase;">Saldo</p>
                  <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:${saldoColor};">R$ ${saldo.toFixed(2).replace('.', ',')}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 20px;">
            <div style="background:#fff8e1;border-radius:10px;padding:12px 16px;border-left:3px solid #ffc107;">
              <p style="margin:0;font-size:13px;color:#555;">
                📊 Seus gastos variaram <strong style="color:${summary.vs_previous_month.diff_percent > 0 ? '#e53935' : '#2e7d32'}">${diffSign}${summary.vs_previous_month.diff_percent}%</strong> em relação ao mês anterior.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1a1a1a;">🗂 Top categorias de gasto</p>
            ${summary.top_categories.map((c: any, i: number) => `
            <div style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
              <span style="font-size:13px;color:#444;">${i + 1}. ${c.category}</span>
              <span style="float:right;font-size:13px;font-weight:600;color:#333;">R$ ${c.total.toFixed(2).replace('.', ',')}</span>
            </div>`).join('')}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1a1a1a;">🤖 Análise do seu Assessor</p>
            <div style="background:#f8f9fa;border-radius:10px;padding:16px;">
              <p style="margin:0;font-size:13px;color:#444;line-height:1.8;white-space:pre-line;">${summary.summary_text}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="https://imoney.ia.br/dashboard" style="display:inline-block;background:#00C853;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">Ver meu dashboard →</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f5f5f5;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#999;">iMoney · Finanças inteligentes para jovens brasileiros</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await resend.emails.send({
    from: 'Gui da iMoney <gui@imoney.ia.br>',
    to: user.email,
    subject: `📊 Seu resumo financeiro de ${monthName} está pronto`,
    html
  })

  await supabase
    .from('monthly_summaries')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('user_id', user.user_id)
    .eq('year', summary.year)
    .eq('month', summary.month)
}
