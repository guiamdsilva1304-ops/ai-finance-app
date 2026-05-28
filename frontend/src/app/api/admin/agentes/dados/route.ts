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

// ─── Coletar métricas completas ───────────────────────────────────────────────

async function coletarMetricas() {
  const agora = Date.now()
  const d7 = new Date(agora - 7 * 86400000).toISOString()
  const d14 = new Date(agora - 14 * 86400000).toISOString()
  const d30 = new Date(agora - 30 * 86400000).toISOString()

  const [
    { count: totalUsuarios },
    { count: novosSemana },
    { count: novosSemanaPassada },
    { count: ativos7d },
    { count: ativos30d },
    { count: pagantes },
    { count: emailsEnviados },
    { count: emailsPendentes },
    { count: totalChats },
    { count: chats7d },
    { count: totalMetas },
    { count: metasConcluidas },
    { count: artigosBlog },
    { count: artigosSemana },
  ] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).neq('is_admin', true),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', d7).neq('is_admin', true),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', d14).lt('created_at', d7).neq('is_admin', true),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('last_login_at', d7).neq('is_admin', true),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('last_login_at', d30).neq('is_admin', true),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).or('is_pro.eq.true,plan.eq.pro'),
    supabase.from('email_queue').select('id', { count: 'exact', head: true }).eq('status', 'enviado'),
    supabase.from('email_queue').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('chat_history').select('id', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('chat_history').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', d7),
    supabase.from('metas').select('id', { count: 'exact', head: true }),
    supabase.from('metas').select('id', { count: 'exact', head: true }).eq('concluida', true),
    supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('blog_posts').select('id', { count: 'exact', head: true }).gte('created_at', d7).eq('published', true),
  ])

  // Score médio dos usuários
  const { data: scores } = await supabase
    .from('user_profiles')
    .select('score_saude')
    .not('score_saude', 'is', null)
    .neq('is_admin', true)

  const scoreMedio = scores?.length
    ? Math.round(scores.reduce((s, u) => s + (u.score_saude ?? 0), 0) / scores.length)
    : null

  // Usuários sem nenhuma interação com o Assessor
  const { count: semAssessor } = await supabase
    .from('user_profiles')
    .select('user_id', { count: 'exact', head: true })
    .not('user_id', 'is', null)
    .neq('is_admin', true)

  // Variação de novos usuários semana a semana
  const variacaoNovos = novosSemanaPassada && novosSemanaPassada > 0
    ? Math.round(((novosSemana ?? 0) - novosSemanaPassada) / novosSemanaPassada * 100)
    : null

  const mrr = (pagantes ?? 0) * 29.90
  const taxaAtivacao = totalUsuarios && totalUsuarios > 0
    ? Math.round(((ativos7d ?? 0) / totalUsuarios) * 100)
    : 0
  const taxaConversao = totalUsuarios && totalUsuarios > 0
    ? Math.round(((pagantes ?? 0) / totalUsuarios) * 100)
    : 0
  const msgsPorUsuario = ativos7d && ativos7d > 0
    ? Math.round((chats7d ?? 0) / ativos7d)
    : 0

  return {
    // Usuários
    totalUsuarios: totalUsuarios ?? 0,
    novosSemana: novosSemana ?? 0,
    novosSemanaPassada: novosSemanaPassada ?? 0,
    variacaoNovos,
    ativos7d: ativos7d ?? 0,
    ativos30d: ativos30d ?? 0,
    taxaAtivacao,

    // Receita
    pagantes: pagantes ?? 0,
    mrr,
    taxaConversao,
    breakEven: 22,
    progressoBreakEven: Math.min(100, Math.round(((pagantes ?? 0) / 22) * 100)),

    // Engajamento
    totalChats: totalChats ?? 0,
    chats7d: chats7d ?? 0,
    msgsPorUsuario,
    totalMetas: totalMetas ?? 0,
    metasConcluidas: metasConcluidas ?? 0,
    scoreMedio,
    semAssessor: semAssessor ?? 0,

    // Conteúdo
    artigosBlog: artigosBlog ?? 0,
    artigosSemana: artigosSemana ?? 0,
    emailsEnviados: emailsEnviados ?? 0,
    emailsPendentes: emailsPendentes ?? 0,

    geradoEm: new Date().toISOString(),
  }
}

// ─── Gerar briefing com IA ───────────────────────────────────────────────────

async function gerarBriefing(metricas: Awaited<ReturnType<typeof coletarMetricas>>) {
  const prompt = `Você é o Agente de Dados da iMoney, fintech SaaS brasileira solo (1 fundador). Analise as métricas da semana e gere um briefing executivo em markdown.

MÉTRICAS DA SEMANA:
- Total usuários: ${metricas.totalUsuarios}
- Novos esta semana: ${metricas.novosSemana} (semana passada: ${metricas.novosSemanaPassada}, variação: ${metricas.variacaoNovos !== null ? `${metricas.variacaoNovos > 0 ? '+' : ''}${metricas.variacaoNovos}%` : 'n/a'})
- Ativos 7 dias: ${metricas.ativos7d} (${metricas.taxaAtivacao}% do total)
- Ativos 30 dias: ${metricas.ativos30d}
- Pagantes: ${metricas.pagantes} | MRR: R$ ${metricas.mrr.toFixed(2)}
- Conversão free→pro: ${metricas.taxaConversao}%
- Break-even: ${metricas.pagantes}/${metricas.breakEven} pagantes (${metricas.progressoBreakEven}%)
- Msgs no Assessor (7d): ${metricas.chats7d} | Média por ativo: ${metricas.msgsPorUsuario}
- Metas criadas: ${metricas.totalMetas} | Concluídas: ${metricas.metasConcluidas}
- Score médio saúde: ${metricas.scoreMedio ?? 'sem dados'}/100
- Artigos no blog: ${metricas.artigosBlog} | Novos essa semana: ${metricas.artigosSemana}
- Emails enviados: ${metricas.emailsEnviados} | Pendentes: ${metricas.emailsPendentes}

ESTRUTURA DO BRIEFING (use exatamente esta estrutura):

## 📊 Briefing Semanal iMoney — [data de hoje]

### 🎯 Status Geral
[Uma frase direta: verde/amarelo/vermelho e por quê]

### 📈 O que foi bem
[2-3 pontos positivos com números]

### ⚠️ Pontos de atenção
[2-3 riscos ou gargalos com dados concretos]

### ⚡ 3 ações para esta semana
[Exatamente 3 ações prioritárias, ordenadas por impacto, cada uma em 1 linha]

### 💡 Insight da semana
[Um insight não óbvio baseado nos dados, máx 2 frases]

Seja direto, use números, sem enrolação. Tom: CEO analítico.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  return msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('').trim()
}

// ─── Email do briefing ────────────────────────────────────────────────────────

function briefingParaHTML(markdown: string): string {
  const html = markdown
    .replace(/^## (.+)$/gm, '<h2 style="color:#0a3d28;font-size:18px;font-weight:900;margin:0 0 16px">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="color:#1D9E75;font-size:14px;font-weight:800;margin:16px 0 8px;text-transform:uppercase;letter-spacing:0.05em">$1</h3>')
    .replace(/^\[(.+)\]$/gm, '<p style="color:#6b7280;font-size:13px;font-style:italic;margin:0 0 8px">$1</p>')
    .replace(/^- (.+)$/gm, '<li style="font-size:14px;color:#1a1a1a;line-height:1.6;margin-bottom:6px">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 12px">')

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#f0fdf4;font-family:Nunito,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:28px 36px">
<div style="display:flex;align-items:center;gap:12px">
<span style="color:#fff;font-size:24px;font-weight:900">iMoney</span>
<span style="color:rgba(255,255,255,0.6);font-size:14px;font-weight:600">· Briefing Semanal do Agente de Dados</span>
</div>
</td></tr>
<tr><td style="padding:36px">
${html}
<div style="margin-top:28px;padding-top:20px;border-top:1px solid #f0f7f2;text-align:center">
<a href="https://imoney.ia.br/admin/agentes" style="background:#1D9E75;color:#fff;text-decoration:none;padding:12px 28px;border-radius:40px;font-weight:800;font-size:14px;display:inline-block">Ver painel completo →</a>
</div>
</td></tr>
<tr><td style="padding:16px 36px 24px;border-top:1px solid #f0fdf4;text-align:center">
<p style="color:#9ca3af;font-size:11px;margin:0">Gerado automaticamente pelo Agente de Dados · iMoney © 2026</p>
</td></tr></table></td></tr></table></body></html>`
}

// ─── GET — gerar briefing agora ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = req.headers.get('x-admin-key')
  const cronSecret = req.headers.get('authorization')
  const sessionCookie = req.cookies.get('imoney_admin_session')?.value
  const SECRET = process.env.ADMIN_SESSION_SECRET || 'imoney-admin-secret-2025'
  const isAdmin = auth === SECRET || sessionCookie === SECRET
  const isCron = cronSecret === `Bearer ${process.env.CRON_SECRET}`
  if (!isAdmin && !isCron) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const metricas = await coletarMetricas()
    const briefing = await gerarBriefing(metricas)

    // Se for segunda-feira ou chamada manual com ?enviar=true, manda email
    const enviar = req.nextUrl.searchParams.get('enviar') === 'true' || new Date().getDay() === 1
    if (enviar) {
      await resend.emails.send({
        from: 'Agente de Dados iMoney <gui@imoney.ia.br>',
        to: 'guiamdsilva1304@gmail.com',
        subject: `📊 Briefing iMoney — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
        html: briefingParaHTML(briefing),
        text: briefing,
      })
    }

    return NextResponse.json({ ok: true, metricas, briefing, emailEnviado: enviar })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
