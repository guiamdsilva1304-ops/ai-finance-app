import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const resend = new Resend(process.env.RESEND_API_KEY!)

// ─── Tipos ───────────────────────────────────────────────────────────────────

type GatilhoTipo = 'meta_orfa' | 'score_critico' | 'estagnacao' | 'quase_la'

interface UsuarioGatilho {
  user_id: string
  email: string
  nome: string
  gatilho: GatilhoTipo
  contexto: {
    meta_nome?: string
    meta_pct?: number
    score?: number
    dias_sem_login?: number
    dias_sem_aporte?: number
    total_msgs?: number
  }
}

// ─── Detectar gatilhos comportamentais ──────────────────────────────────────

async function detectarGatilhos(): Promise<UsuarioGatilho[]> {
  const { data: users } = await supabase
    .from('user_profiles')
    .select('user_id, nome, last_login_at, created_at, score_saude, onboarding_completo')
    .not('user_id', 'is', null)
    .neq('is_admin', true)

  if (!users?.length) return []

  const agora = Date.now()
  const gatilhos: UsuarioGatilho[] = []

  for (const u of users) {
    const { data: au } = await supabase.auth.admin.getUserById(u.user_id)
    const email = au?.user?.email
    if (!email || email.includes('teste') || email.includes('sinco')) continue

    const nome = (u.nome || email.split('@')[0]).split(' ')[0]
    const diasSemLogin = u.last_login_at
      ? Math.floor((agora - new Date(u.last_login_at).getTime()) / 86400000)
      : 999
    const diasCadastro = Math.floor((agora - new Date(u.created_at).getTime()) / 86400000)

    // Buscar metas e chats em paralelo
    const [{ data: metas }, { count: totalMsgs }] = await Promise.all([
      supabase.from('metas').select('id, nome, valor_alvo, valor_atual, concluida, updated_at').eq('user_id', u.user_id),
      supabase.from('chat_history').select('id', { count: 'exact', head: true }).eq('user_id', u.user_id).eq('role', 'user'),
    ])

    const metasAtivas = (metas ?? []).filter(m => !m.concluida)
    const metasConcluidas = (metas ?? []).filter(m => m.concluida)

    // ── Gatilho 1: Meta órfã ─────────────────────────────────────────────────
    // Tem meta mas nunca conversou com o Assessor sobre ela
    if (
      metasAtivas.length > 0 &&
      (totalMsgs ?? 0) === 0 &&
      diasCadastro >= 2 &&
      diasSemLogin >= 2
    ) {
      const meta = metasAtivas[0]
      gatilhos.push({
        user_id: u.user_id, email, nome,
        gatilho: 'meta_orfa',
        contexto: { meta_nome: meta.nome, meta_pct: 0 }
      })
      continue
    }

    // ── Gatilho 2: Score crítico sem ação ────────────────────────────────────
    // Fez diagnóstico com score baixo mas não voltou em 3+ dias
    if (
      u.score_saude !== null &&
      u.score_saude > 0 &&
      u.score_saude <= 45 &&
      diasSemLogin >= 3
    ) {
      gatilhos.push({
        user_id: u.user_id, email, nome,
        gatilho: 'score_critico',
        contexto: { score: u.score_saude, dias_sem_login: diasSemLogin }
      })
      continue
    }

    // ── Gatilho 3: Estagnação ────────────────────────────────────────────────
    // Tinha engajamento mas parou há 7+ dias (sem ser já capturado pelo CS)
    if (
      (totalMsgs ?? 0) >= 3 &&
      diasSemLogin >= 7 &&
      diasSemLogin < 20
    ) {
      const meta = metasAtivas[0]
      const pct = meta && meta.valor_alvo > 0
        ? Math.round((meta.valor_atual / meta.valor_alvo) * 100)
        : null
      gatilhos.push({
        user_id: u.user_id, email, nome,
        gatilho: 'estagnacao',
        contexto: {
          dias_sem_login: diasSemLogin,
          total_msgs: totalMsgs ?? 0,
          meta_nome: meta?.nome,
          meta_pct: pct ?? undefined,
        }
      })
      continue
    }

    // ── Gatilho 4: Quase lá ──────────────────────────────────────────────────
    // Meta em progresso significativo (40-90%) mas sem update há 5+ dias
    for (const meta of metasAtivas) {
      if (meta.valor_alvo <= 0 || meta.valor_atual <= 0) continue
      const pct = Math.round((meta.valor_atual / meta.valor_alvo) * 100)
      const diasSemUpdate = Math.floor((agora - new Date(meta.updated_at).getTime()) / 86400000)

      if (pct >= 40 && pct <= 92 && diasSemUpdate >= 5) {
        gatilhos.push({
          user_id: u.user_id, email, nome,
          gatilho: 'quase_la',
          contexto: { meta_nome: meta.nome, meta_pct: pct, dias_sem_aporte: diasSemUpdate }
        })
        break
      }
    }
  }

  return gatilhos
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildEmailHTML(subject: string, body: string, cta_url = 'https://imoney.ia.br/dashboard'): string {
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
<a href="${cta_url}" style="background:#1D9E75;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:15px;display:inline-block">
Abrir iMoney →
</a>
</div>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0fdf4;text-align:center">
<p style="color:#9ca3af;font-size:12px;margin:0">© 2026 iMoney · imoney.ia.br</p>
</td></tr></table></td></tr></table></body></html>`
}

// ─── Gerar e enviar email por gatilho ────────────────────────────────────────

async function gerarEEnviar(u: UsuarioGatilho): Promise<{ subject: string; preview: string }> {
  const prompts: Record<GatilhoTipo, string> = {
    meta_orfa: `Escreva um email do Gui (fundador iMoney) para ${u.nome}, que criou a meta "${u.contexto.meta_nome}" mas NUNCA conversou com o Assessor IA sobre ela. Tom: curiosidade genuína, não cobrança. Pergunta como está o sonho dele e oferece ajuda específica do Assessor para criar o plano. Máx 90 palavras. Retorne JSON: {"subject":"assunto max 55 chars","body":"texto com \\n"}`,

    score_critico: `Escreva um email do Gui para ${u.nome}, que tem score de saúde financeira ${u.contexto.score}/100 (crítico) e não voltou ao app há ${u.contexto.dias_sem_login} dias. Tom: aliado que quer ajudar, não julgamento. Mostre que o Assessor tem um plano específico para melhorar o score. Urgência sutil. Máx 90 palavras. Retorne JSON: {"subject":"assunto max 55 chars","body":"texto com \\n"}`,

    estagnacao: `Escreva um email do Gui para ${u.nome}, que usou o Assessor ${u.contexto.total_msgs} vezes mas está afastado há ${u.contexto.dias_sem_login} dias. ${u.contexto.meta_nome ? `Tem a meta "${u.contexto.meta_nome}" (${u.contexto.meta_pct ?? 0}% concluída).` : ''} Tom: parceiro que notou a ausência, não vendedor. Máx 90 palavras. Retorne JSON: {"subject":"assunto max 55 chars","body":"texto com \\n"}`,

    quase_la: `Escreva um email do Gui para ${u.nome}, que está com ${u.contexto.meta_pct}% da meta "${u.contexto.meta_nome}" concluída mas parou de aportar há ${u.contexto.dias_sem_aporte} dias. Tom: torcida genuína, motivação real, não pressão. Celebre o progresso e mostre que falta pouco. Máx 90 palavras. Retorne JSON: {"subject":"assunto max 55 chars","body":"texto com \\n"}`,
  }

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: 'Responda SOMENTE com JSON válido. Sem markdown.',
    messages: [{ role: 'user', content: prompts[u.gatilho] }],
  })

  const raw = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('').trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON inválido')
  const { subject, body } = JSON.parse(match[0])

  const cta = u.gatilho === 'quase_la' || u.gatilho === 'meta_orfa'
    ? 'https://imoney.ia.br/dashboard/metas'
    : u.gatilho === 'score_critico'
    ? 'https://imoney.ia.br/dashboard/score'
    : 'https://imoney.ia.br/dashboard/assessor'

  await resend.emails.send({
    from: 'Gui da iMoney <gui@imoney.ia.br>',
    to: u.email,
    subject,
    html: buildEmailHTML(subject, body, cta),
    text: body,
  })

  return { subject, preview: body.slice(0, 100) }
}

// ─── Anti-spam ───────────────────────────────────────────────────────────────

async function jaRecebeuRetencao(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('email_queue')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .like('type', 'retencao_%')
    .gte('created_at', new Date(Date.now() - 5 * 86400000).toISOString())
  return (count ?? 0) > 0
}

// ─── GET — diagnóstico ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = req.headers.get('x-admin-key')
  const cronAuth = req.headers.get('authorization')
  const isAdmin = auth === process.env.ADMIN_SESSION_SECRET
  const isCron = cronAuth === `Bearer ${process.env.CRON_SECRET}`
  if (!isAdmin && !isCron) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gatilhos = await detectarGatilhos()

  const resumo = {
    total: gatilhos.length,
    meta_orfa: gatilhos.filter(g => g.gatilho === 'meta_orfa').length,
    score_critico: gatilhos.filter(g => g.gatilho === 'score_critico').length,
    estagnacao: gatilhos.filter(g => g.gatilho === 'estagnacao').length,
    quase_la: gatilhos.filter(g => g.gatilho === 'quase_la').length,
  }

  return NextResponse.json({ resumo, gatilhos })
}

// ─── POST — executar ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-key')
  const cronAuth = req.headers.get('authorization')
  const isAdmin = auth === process.env.ADMIN_SESSION_SECRET
  const isCron = cronAuth === `Bearer ${process.env.CRON_SECRET}`
  if (!isAdmin && !isCron) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const filtro: GatilhoTipo | 'todos' = body.gatilho ?? 'todos'

  const gatilhos = await detectarGatilhos()
  const alvos = filtro === 'todos' ? gatilhos : gatilhos.filter(g => g.gatilho === filtro)

  const resultados: Array<{ email: string; gatilho: string; subject: string; preview: string }> = []
  const erros: Array<{ email: string; erro: string }> = []

  for (const u of alvos) {
    if (await jaRecebeuRetencao(u.user_id)) continue
    try {
      const r = await gerarEEnviar(u)
      await supabase.from('email_queue').insert({
        user_id: u.user_id,
        email: u.email,
        type: `retencao_${u.gatilho}`,
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        status: 'enviado',
      })
      resultados.push({ email: u.email, gatilho: u.gatilho, ...r })
      await new Promise(r => setTimeout(r, 500))
    } catch (e) {
      erros.push({ email: u.email, erro: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({ ok: true, enviados: resultados.length, resultados, erros })
}
