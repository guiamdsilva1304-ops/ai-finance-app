import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'sk-ant-placeholder' })
const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')

const LIMITE_FREE = 15
const PRECO_PRO = 14.90
const META_PAGANTES = 22

// ─── Mapeamento de oportunidades de receita ──────────────────────────────────

async function mapearOportunidades() {
  const hoje = new Date().toISOString().split('T')[0]

  const { data: users } = await supabase
    .from('user_profiles')
    .select('user_id, nome, plan, daily_messages_count, daily_messages_date, score_saude, created_at, last_login_at')
    .not('user_id', 'is', null)
    .neq('is_admin', true)

  if (!users?.length) return {
    perto_do_limite: [],
    alta_frequencia: [],
    pagantes: [],
    resumo: { mrr: 0, pagantes: 0, potencial_upgrade: 0 }
  }

  const perto_do_limite = []
  const alta_frequencia = []
  const pagantes = []

  for (const u of users) {
    const { data: au } = await supabase.auth.admin.getUserById(u.user_id)
    const email = au?.user?.email
    if (!email || email.includes('teste')) continue

    const nome = (u.nome || email.split('@')[0]).split(' ')[0]
    const isPro = u.plan === 'pro' || u.plan === 'premium'
    const usadasHoje = u.daily_messages_date === hoje ? (u.daily_messages_count ?? 0) : 0
    const pct = usadasHoje / LIMITE_FREE

    const { count: totalMsgs } = await supabase
      .from('chat_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.user_id)
      .eq('role', 'user')

    const diasCadastro = Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000)

    const perfil = {
      user_id: u.user_id,
      email,
      nome,
      plan: u.plan ?? 'free',
      usadasHoje,
      pct: Math.round(pct * 100),
      totalMsgs: totalMsgs ?? 0,
      score: u.score_saude,
      diasCadastro,
    }

    if (isPro) {
      pagantes.push(perfil)
    } else if (pct >= 0.7 && pct < 1) {
      perto_do_limite.push(perfil)
    } else if ((totalMsgs ?? 0) >= 8 && diasCadastro >= 3) {
      alta_frequencia.push(perfil)
    }
  }

  const mrr = pagantes.length * PRECO_PRO
  const potencial_upgrade = (perto_do_limite.length + alta_frequencia.length) * PRECO_PRO

  return {
    perto_do_limite: perto_do_limite.sort((a, b) => b.pct - a.pct),
    alta_frequencia: alta_frequencia.sort((a, b) => b.totalMsgs - a.totalMsgs),
    pagantes,
    resumo: {
      mrr,
      pagantes: pagantes.length,
      potencial_upgrade,
      progresso_break_even: Math.round((pagantes.length / META_PAGANTES) * 100),
    }
  }
}

// ─── Email de upgrade contextual ─────────────────────────────────────────────

function buildEmailHTML(subject: string, body: string): string {
  const bodyHtml = body.split('\n').filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#1a1a1a">${p}</p>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#f0fdf4;font-family:Nunito,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:24px 32px;text-align:center">
<span style="color:#fff;font-size:22px;font-weight:900">iMoney 💚</span>
</td></tr>
<tr><td style="padding:36px 32px">
<h2 style="color:#0a3d28;font-size:19px;font-weight:900;margin:0 0 20px">${subject}</h2>
${bodyHtml}
<div style="margin:28px 0;text-align:center">
<a href="https://imoney.ia.br/dashboard/pro" style="background:#1D9E75;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:15px;display:inline-block">
Conhecer o iMoney Pro →
</a>
</div>
<div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin-top:8px;text-align:center">
<p style="margin:0;font-size:13px;color:#374151;font-weight:600">
💚 iMoney Pro · R$ 14,90/mês · 50 mensagens/dia · Cancele quando quiser
</p>
</div>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0fdf4;text-align:center">
<p style="color:#9ca3af;font-size:12px;margin:0">© 2026 iMoney · imoney.ia.br</p>
</td></tr></table></td></tr></table></body></html>`
}

async function gerarEmailUpgrade(perfil: { nome: string; email: string; usadasHoje: number; pct: number; totalMsgs: number; score: number | null }) {
  const tipo = perfil.pct >= 70
    ? `atingiu ${perfil.pct}% do limite diário (${perfil.usadasHoje}/${LIMITE_FREE} msgs hoje)`
    : `já enviou ${perfil.totalMsgs} mensagens ao Assessor no total`

  const prompt = `Escreva um email de upgrade para ${perfil.nome}, usuário free da iMoney que ${tipo}. 
Score de saúde financeira: ${perfil.score ?? '?'}/100.
Tom: celebrar o engajamento dele (isso é raro!), mostrar que com o Pro ele não perde o ritmo.
NÃO seja vendedor. Seja o Gui, fundador, que percebeu que esse usuário está comprometido com os sonhos financeiros dele.
Mencione que por R$ 14,90/mês ele tem 50 msgs/dia (mais de 3x o limite atual).
Máx 100 palavras. Retorne JSON sem markdown: {"subject":"assunto max 55 chars","body":"texto com \\n entre parágrafos"}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: 'Responda SOMENTE com JSON válido. Sem markdown.',
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('').trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON inválido')
  const { subject, body } = JSON.parse(match[0])

  await resend.emails.send({
    from: 'Gui da iMoney <gui@imoney.ia.br>',
    to: perfil.email,
    subject,
    html: buildEmailHTML(subject, body),
    text: body,
  })

  return { subject, preview: body.slice(0, 100) }
}

async function jaRecebeuUpgrade(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('email_queue')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .like('type', 'receita_%')
    .gte('created_at', new Date(Date.now() - 5 * 86400000).toISOString())
  return (count ?? 0) > 0
}

// ─── GET — diagnóstico ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = req.headers.get('x-admin-key')
  const sessionCookie = req.cookies.get('imoney_admin_session')?.value
  const SECRET = process.env.ADMIN_SESSION_SECRET || 'imoney-admin-secret-2025'
  if (auth !== SECRET && sessionCookie !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const oportunidades = await mapearOportunidades()
  return NextResponse.json(oportunidades)
}

// ─── POST — disparar emails de upgrade ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-key')
  const sessionCookie = req.cookies.get('imoney_admin_session')?.value
  const SECRET = process.env.ADMIN_SESSION_SECRET || 'imoney-admin-secret-2025'
  if (auth !== SECRET && sessionCookie !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { acao } = await req.json()
  const oportunidades = await mapearOportunidades()
  const resultados: Array<{ email: string; subject: string; preview: string }> = []
  const erros: Array<{ email: string; erro: string }> = []

  const alvos = acao === 'upgrade_limite'
    ? oportunidades.perto_do_limite
    : acao === 'upgrade_frequencia'
    ? oportunidades.alta_frequencia
    : [...oportunidades.perto_do_limite, ...oportunidades.alta_frequencia]

  for (const u of alvos) {
    if (await jaRecebeuUpgrade(u.user_id)) continue
    try {
      const r = await gerarEmailUpgrade(u)
      await supabase.from('email_queue').insert({
        user_id: u.user_id,
        email: u.email,
        type: 'receita_upgrade',
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        status: 'enviado',
      })
      resultados.push({ email: u.email, ...r })
      await new Promise(r => setTimeout(r, 400))
    } catch (e) {
      erros.push({ email: u.email, erro: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({ ok: true, enviados: resultados.length, resultados, erros })
}
