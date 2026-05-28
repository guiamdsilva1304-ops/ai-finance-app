import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

// ─── Orquestrador dos agentes CS, Dados e Receita ────────────────────────────
//
// Schedule: 0 10 * * * (todo dia às 10h BRT)
//
// Lógica:
//   - Agente CS     → todo dia: engaja usuários em risco + reativa inativos
//   - Agente Dados  → apenas segunda-feira: gera e envia briefing executivo
//   - Agente Receita → todo dia: dispara upgrade para quem está perto do limite

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminKey = process.env.ADMIN_SESSION_SECRET ?? ''
  const origin = req.nextUrl.origin
  const diaSemana = new Date().getDay() // 0=dom, 1=seg, ..., 6=sab
  const resultados: Record<string, unknown> = {}
  const erros: Record<string, string> = {}

  // ── Agente CS: todo dia ────────────────────────────────────────────────────
  try {
    const res = await fetch(`${origin}/api/admin/agentes/cs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ acao: 'rodar_tudo' }),
    })
    const data = await res.json()
    resultados.cs = { enviados: data.enviados ?? 0, erros: data.erros?.length ?? 0 }
  } catch (e) {
    erros.cs = e instanceof Error ? e.message : String(e)
  }

  // ── Agente Dados: apenas segunda-feira ────────────────────────────────────
  if (diaSemana === 1) {
    try {
      const res = await fetch(`${origin}/api/admin/agentes/dados?enviar=true`, {
        headers: { 'x-admin-key': adminKey },
      })
      const data = await res.json()
      resultados.dados = { emailEnviado: data.emailEnviado, ok: data.ok }
    } catch (e) {
      erros.dados = e instanceof Error ? e.message : String(e)
    }
  } else {
    resultados.dados = { skipped: true, motivo: 'apenas segunda-feira' }
  }

  // ── Agente Receita: todo dia ───────────────────────────────────────────────
  try {
    const res = await fetch(`${origin}/api/admin/agentes/receita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ acao: 'rodar_tudo' }),
    })
    const data = await res.json()
    resultados.receita = { enviados: data.enviados ?? 0, erros: data.erros?.length ?? 0 }
  } catch (e) {
    erros.receita = e instanceof Error ? e.message : String(e)
  }

  // ── Agente Conteúdo: segunda e quinta ────────────────────────────────────
  if (diaSemana === 1 || diaSemana === 4) {
    try {
      const res = await fetch(`${origin}/api/admin/agentes/conteudo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ acao: 'semana_completa' }),
      })
      const data = await res.json()
      resultados.conteudo = { gerados: data.gerados ?? 0, ok: data.ok }
    } catch (e) {
      erros.conteudo = e instanceof Error ? e.message : String(e)
    }
  } else {
    resultados.conteudo = { skipped: true, motivo: 'apenas segunda e quinta' }
  }

  return NextResponse.json({
    ok: true,
    executadoEm: new Date().toISOString(),
    diaSemana,
    resultados,
    erros: Object.keys(erros).length > 0 ? erros : undefined,
  })
}
