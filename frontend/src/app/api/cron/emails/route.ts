import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

function buildEmailHTML(subject: string, body: string): string {
  const bodyHtml = body
    .split('\n')
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 12px">${p}</p>`)
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#f0fdf4;font-family:Nunito,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:28px 32px;text-align:center">
<span style="color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px">iMoney</span>
<p style="color:#dcfce7;font-size:13px;margin:4px 0 0;font-weight:600">Seu assessor financeiro com IA</p>
</td></tr>
<tr><td style="padding:36px 32px">
<h1 style="color:#14532d;font-size:20px;font-weight:800;margin:0 0 20px;line-height:1.3">${subject}</h1>
<div style="color:#374151;font-size:15px;line-height:1.8">${bodyHtml}</div>
<div style="margin:32px 0;text-align:center">
<a href="https://imoney.ia.br/dashboard" style="background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:800;font-size:15px;display:inline-block">
Abrir iMoney</a></div>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0fdf4;text-align:center">
<p style="color:#9ca3af;font-size:12px;margin:0">Voce recebe este email por ser usuario do iMoney.<br>
© 2026 iMoney · Feito com amor no Brasil</p>
</td></tr></table></td></tr></table></body></html>`
}

const EMAIL_PROMPTS: Record<string, string> = {
  welcome:
    'Crie um email de boas-vindas para {nome} que acabou de se cadastrar no iMoney, app gratuito de financas pessoais com IA para brasileiros. Seja caloroso e motivador. Inclua 3 primeiros passos simples: 1) Cadastrar renda mensal 2) Adicionar primeiros gastos 3) Conversar com o assessor IA. Max 120 palavras. Tom amigavel e brasileiro. Retorne JSON: {"subject":"assunto impactante max 50 chars","body":"texto com quebras de linha \\n"}',
  onboarding_day1:
    'Crie um email de re-engajamento para {nome} que se cadastrou no iMoney ontem mas ainda nao explorou o app. Seja humano e curioso — pergunte o que impediu, mostre que o Assessor IA esta esperando por uma conversa sobre as financas dele. Termine com UMA pergunta direta que instigue a resposta. Max 100 palavras. Tom pessoal, como se fosse o proprio fundador escrevendo. O fundador se chama Gui Moreira — assine como Gui, fundador da iMoney. Retorne JSON: {"subject":"assunto max 50 chars que gere curiosidade","body":"texto com quebras de linha \\n"}',
  onboarding_day3:
    'Crie um email de dica para {nome}, usuario do iMoney ha 3 dias. Ensine como criar uma meta financeira no app (ex: reserva de emergencia) e como o assessor IA ajuda a planejar. Max 120 palavras. Tom encorajador. Retorne JSON: {"subject":"dica financeira para voce max 50 chars","body":"texto com quebras de linha \\n"}',
  onboarding_day7:
    'Crie um email de check-in para {nome}, usuario do iMoney ha 1 semana. Parabenize pelo primeiro passo, destaque o recurso de analise de gastos com IA, e encoraje a continuar. Max 120 palavras. Tom humano e parceiro. Retorne JSON: {"subject":"como foi sua primeira semana? max 50 chars","body":"texto com quebras de linha \\n"}',
}

async function generateEmail(type: string, nome: string, extraContext = ''): Promise<{ subject: string; body: string }> {
  const template = EMAIL_PROMPTS[type] ?? EMAIL_PROMPTS.welcome
  const prompt = template.replace(/\{nome\}/g, nome) + (extraContext ? ` Contexto adicional: ${extraContext}` : '')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: 'Voce e o assistente de email marketing da iMoney. O app foi fundado por Gui Moreira. Quando o email mencionar ou assinar como fundador, use SEMPRE "Gui" ou "Gui Moreira". NUNCA invente outros nomes. Responda SOMENTE com JSON valido. Sem markdown. Sem texto fora do JSON.',
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = msg.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta invalida da IA')
  return JSON.parse(match[0])
}

async function sendEmail(to: string, subject: string, body: string) {
  return resend.emails.send({
    from: 'Gui da iMoney <gui@imoney.ia.br>',
    to,
    subject,
    html: buildEmailHTML(subject, body),
    text: body,
  })
}

// Lê a email_queue e envia todos os emails pendentes com scheduled_at <= agora
async function processEmailQueue(): Promise<{ queued: number }> {
  const now = new Date().toISOString()
  const { data: emails, error } = await supabaseAdmin
    .from('email_queue')
    .select('id, user_id, email, type')
    .lte('scheduled_for', now)
    .is('sent_at', null)
    .neq('status', 'enviado')
    .limit(50)

  if (error) throw error
  if (!emails?.length) return { queued: 0 }

  let count = 0
  for (const item of emails) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('nome')
        .eq('id', item.user_id)
        .maybeSingle()

      const nome = profile?.nome || item.email.split('@')[0]
      const { subject, body } = await generateEmail(item.type, nome)

      await sendEmail(item.email, subject, body)

      await supabaseAdmin
        .from('email_queue')
        .update({ sent_at: new Date().toISOString(), status: 'enviado' })
        .eq('id', item.id)

      count++
    } catch (e) {
      console.error(`[EMAIL QUEUE] Erro ${item.email} (${item.type}):`, e)
      try {
        await supabaseAdmin
          .from('email_queue')
          .update({ status: 'erro', metadata: { error: e instanceof Error ? e.message : String(e) } })
          .eq('id', item.id)
      } catch {}
    }
  }
  return { queued: count }
}

// Retenção semanal — toda segunda-feira
async function sendWeeklyEmails(): Promise<{ weekly: number }> {
  if (new Date().getDay() !== 1) return { weekly: 0 }
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const { data: users } = await supabaseAdmin.from('user_profiles').select('id, email, nome')
  if (!users?.length) return { weekly: 0 }

  let count = 0
  for (const user of users) {
    try {
      const nome = user.nome || user.email.split('@')[0]
      const { data: tx } = await supabaseAdmin
        .from('transactions')
        .select('valor, tipo, categoria')
        .eq('user_id', user.id)
        .gte('date', weekAgo.toISOString().split('T')[0])
      const gastos = (tx ?? []).filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.valor), 0)
      const renda = (tx ?? []).filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0)
      const ctx = `${tx?.length ?? 0} transacoes, R$ ${renda.toFixed(2)} renda, R$ ${gastos.toFixed(2)} gastos, sobra R$ ${(renda - gastos).toFixed(2)}. ${!tx?.length ? 'Usuario nao lancou transacoes — incentive.' : 'De 1 dica financeira pratica.'}`
      const { subject, body } = await generateEmail('weekly', nome, ctx)
      await sendEmail(user.email, subject, body)
      count++
    } catch (e) {
      console.error(`[WEEKLY] Erro ${user.email}:`, e)
    }
  }
  return { weekly: count }
}

// Retenção mensal — dia 1 de cada mês
async function sendMonthlyEmails(): Promise<{ monthly: number }> {
  if (new Date().getDate() !== 1) return { monthly: 0 }
  const today = new Date()
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
  const monthName = lastMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const { data: users } = await supabaseAdmin.from('user_profiles').select('id, email, nome')
  if (!users?.length) return { monthly: 0 }

  let count = 0
  for (const user of users) {
    try {
      const nome = user.nome || user.email.split('@')[0]
      const { data: tx } = await supabaseAdmin
        .from('transactions')
        .select('valor, tipo, categoria')
        .eq('user_id', user.id)
        .gte('date', lastMonth.toISOString().split('T')[0])
        .lte('date', lastMonthEnd.toISOString().split('T')[0])
      const gastos = (tx ?? []).filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.valor), 0)
      const renda = (tx ?? []).filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0)
      const cats: Record<string, number> = {}
      ;(tx ?? []).filter(t => t.tipo === 'gasto').forEach(t => {
        cats[t.categoria] = (cats[t.categoria] ?? 0) + Number(t.valor)
      })
      const topCats = Object.entries(cats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, v]) => `${c}: R$ ${v.toFixed(2)}`)
        .join(', ')
      const ctx = `Mes: ${monthName}. R$ ${renda.toFixed(2)} renda, R$ ${gastos.toFixed(2)} gastos, sobra R$ ${(renda - gastos).toFixed(2)}. ${topCats ? `Top gastos: ${topCats}.` : 'Sem gastos registrados.'} ${renda - gastos > 0 ? 'Sugira Tesouro Selic ou CDB.' : 'De dicas para equilibrar no proximo mes.'}`
      const { subject, body } = await generateEmail('monthly', nome, ctx)
      await sendEmail(user.email, subject, body)
      count++
    } catch (e) {
      console.error(`[MONTHLY] Erro ${user.email}:`, e)
    }
  }
  return { monthly: count }
}

EMAIL_PROMPTS.weekly =
  'Crie email de resumo semanal para {nome} no iMoney. Max 120 palavras. Tom encorajador. Retorne JSON: {"subject":"resumo semanal max 50 chars","body":"texto com \\n"}'
EMAIL_PROMPTS.monthly =
  'Crie email de resumo mensal para {nome} no iMoney. Max 150 palavras. Tom parceiro. Retorne JSON: {"subject":"resumo mensal max 50 chars","body":"texto com \\n"}'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET ?? process.env.imoneycronsecret2026
  const auth = req.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [queue, weekly, monthly] = await Promise.all([
      processEmailQueue(),
      sendWeeklyEmails(),
      sendMonthlyEmails(),
    ])

    // Segunda-feira: dispara briefing do Agente de Dados
    if (new Date().getDay() === 1) {
      try {
        await fetch(`${req.nextUrl.origin}/api/admin/agentes/dados?enviar=true`, {
          headers: { 'x-admin-key': process.env.ADMIN_SESSION_SECRET ?? '' },
        })
      } catch { /* silencioso */ }
    }

    return NextResponse.json({ ok: true, ...queue, ...weekly, ...monthly })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[CRON EMAILS]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
