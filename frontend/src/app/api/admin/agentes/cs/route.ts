import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const resend = new Resend(process.env.RESEND_API_KEY!)

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface UserPerfil {
  user_id: string
  email: string
  nome: string
  diasSemLogin: number
  diasCadastro: number
  chatCount: number
  metaCount: number
  score: number | null
  plano: string
}

// ─── Mapear usuários por segmento ────────────────────────────────────────────

async function mapearUsuarios() {
  const { data: users } = await supabase
    .from('user_profiles')
    .select('user_id, nome, last_login_at, created_at, onboarding_completo, score_saude, plan, is_admin')
    .not('user_id', 'is', null)

  if (!users?.length) return { emRisco: [] as UserPerfil[], inativos: [] as UserPerfil[], novos: [] as UserPerfil[], engajados: [] as UserPerfil[] }

  const agora = Date.now()
  const emRisco: UserPerfil[] = []
  const inativos: UserPerfil[] = []
  const novos: UserPerfil[] = []
  const engajados: UserPerfil[] = []

  for (const u of users) {
    if (u.is_admin) continue

    const { data: au } = await supabase.auth.admin.getUserById(u.user_id)
    const email = au?.user?.email
    if (!email || email.includes('teste') || email.includes('sinco')) continue

    const diasSemLogin = u.last_login_at
      ? Math.floor((agora - new Date(u.last_login_at).getTime()) / 86400000)
      : 999
    const diasCadastro = Math.floor((agora - new Date(u.created_at).getTime()) / 86400000)

    const [{ count: chatCount }, { count: metaCount }] = await Promise.all([
      supabase.from('chat_history').select('id', { count: 'exact', head: true }).eq('user_id', u.user_id).eq('role', 'user'),
      supabase.from('metas').select('id', { count: 'exact', head: true }).eq('user_id', u.user_id),
    ])

    const perfil: UserPerfil = {
      user_id: u.user_id,
      email,
      nome: (u.nome || email.split('@')[0]).split(' ')[0],
      diasSemLogin,
      diasCadastro,
      chatCount: chatCount ?? 0,
      metaCount: metaCount ?? 0,
      score: u.score_saude,
      plano: u.plan ?? 'free',
    }

    if (diasSemLogin <= 3 && (chatCount ?? 0) >= 3) {
      engajados.push(perfil)
    } else if (diasCadastro >= 2 && diasCadastro <= 6 && (chatCount ?? 0) === 0) {
      emRisco.push(perfil)
    } else if (diasSemLogin >= 7 && (chatCount ?? 0) > 0) {
      inativos.push(perfil)
    } else if (diasCadastro < 2) {
      novos.push(perfil)
    }
  }

  return { emRisco, inativos, novos, engajados }
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

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
<a href="https://imoney.ia.br/dashboard/assessor" style="background:#1D9E75;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:15px;display:inline-block">Abrir iMoney →</a>
</div>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0fdf4;text-align:center">
<p style="color:#9ca3af;font-size:12px;margin:0">© 2026 iMoney · imoney.ia.br</p>
</td></tr></table></td></tr></table></body></html>`
}

// ─── Gerar e enviar email via IA ─────────────────────────────────────────────

async function gerarEEnviarEmail(tipo: 'risco' | 'inativo' | 'engajado_upgrade', perfil: UserPerfil) {
  const prompts: Record<string, string> = {
    risco: `Escreva um email curto e pessoal do Gui (fundador da iMoney) para ${perfil.nome}, que se cadastrou há alguns dias mas NUNCA conversou com o Assessor IA. Tom: humano, curioso, sem pressão. Pergunta o que impediu. Máx 80 palavras. Retorne JSON sem markdown: {"subject":"assunto max 50 chars","body":"texto com \\n entre parágrafos"}`,
    inativo: `Escreva um email de reativação do Gui para ${perfil.nome}, que usou a iMoney (${perfil.chatCount} msgs no Assessor) mas sumiu há ${perfil.diasSemLogin} dias. Tom: parceiro que sentiu falta, não vendedor. Mencione que o Assessor lembra das metas dele. Máx 90 palavras. Retorne JSON sem markdown: {"subject":"assunto max 50 chars","body":"texto com \\n entre parágrafos"}`,
    engajado_upgrade: `Escreva um email de upgrade para ${perfil.nome}, usuário engajado da iMoney com score ${perfil.score ?? '?'}/100 e ${perfil.chatCount} conversas com o Assessor. Celebre o progresso e mostre que o Pro acelera os sonhos financeiros. Máx 100 palavras. Retorne JSON sem markdown: {"subject":"assunto max 50 chars","body":"texto com \\n entre parágrafos"}`,
  }

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: 'Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.',
    messages: [{ role: 'user', content: prompts[tipo] }],
  })

  const raw = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('').trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON inválido da IA')
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

// ─── Verificar anti-spam ──────────────────────────────────────────────────────

async function jaRecebeuRecente(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('email_queue')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 3 * 86400000).toISOString())
    .eq('status', 'enviado')
  return (count ?? 0) > 0
}

// ─── GET — diagnóstico ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = req.headers.get('x-admin-key')
  if (auth !== process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const seg = await mapearUsuarios()
  return NextResponse.json({
    resumo: {
      em_risco: seg.emRisco.length,
      inativos: seg.inativos.length,
      novos: seg.novos.length,
      engajados: seg.engajados.length,
    },
    detalhes: seg,
  })
}

// ─── POST — executar ação ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-key')
  if (auth !== process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { acao } = await req.json()

  const seg = await mapearUsuarios()
  const resultados: Array<{ email: string; tipo: string; subject: string; preview: string }> = []
  const erros: Array<{ email: string; erro: string }> = []

  async function processar(lista: UserPerfil[], tipo: 'risco' | 'inativo' | 'engajado_upgrade') {
    for (const u of lista) {
      if (await jaRecebeuRecente(u.user_id)) continue
      try {
        const r = await gerarEEnviarEmail(tipo, u)
        await supabase.from('email_queue').insert({
          user_id: u.user_id,
          email: u.email,
          type: `cs_${tipo}`,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          status: 'enviado',
        })
        resultados.push({ email: u.email, tipo, ...r })
        await new Promise(r => setTimeout(r, 400))
      } catch (e) {
        erros.push({ email: u.email, erro: e instanceof Error ? e.message : String(e) })
      }
    }
  }

  if (acao === 'engajar_risco' || acao === 'rodar_tudo') await processar(seg.emRisco, 'risco')
  if (acao === 'reativar_inativos' || acao === 'rodar_tudo') await processar(seg.inativos, 'inativo')
  if (acao === 'upgrade_engajados' || acao === 'rodar_tudo') await processar(seg.engajados.filter(u => u.plano === 'free'), 'engajado_upgrade')

  return NextResponse.json({ ok: true, enviados: resultados.length, resultados, erros })
}
