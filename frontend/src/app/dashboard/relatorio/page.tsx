'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CAT_COLORS = ['#00C853','#1a3a1a','#4ade80','#86efac','#f59e0b',
                    '#fb923c','#6366f1','#a855f7','#14b8a6','#ef4444']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtShort(v: number) {
  if (v >= 1000) return `R$\u00a0${(v / 1000).toFixed(1).replace('.', ',')}k`
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RelatorioPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowser()

  const now = new Date()
  const [mes,  setMes]  = useState(now.getMonth())
  const [ano,  setAno]  = useState(now.getFullYear())
  const [plan, setPlan] = useState<string | null>(null)
  const [nome, setNome] = useState('')

  const [receitas,   setReceitas]   = useState(0)
  const [gastos,     setGastos]     = useState(0)
  const [categorias, setCategorias] = useState<{ nome: string; valor: number }[]>([])
  const [metas,      setMetas]      = useState<{ nome: string; pct: number; cor: string }[]>([])
  const [loading,    setLoading]    = useState(true)

  const [analise,   setAnalise]   = useState<{ narrativa: string; proximos_passos: string[] } | null>(null)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [iaError,   setIaError]   = useState('')

  // Chart YAxis width responsive
  const [yAxisW, setYAxisW] = useState(96)
  useEffect(() => {
    const update = () => setYAxisW(window.innerWidth < 400 ? 72 : window.innerWidth < 520 ? 84 : 96)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Gate premium
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: p } = await supabase.from('user_profiles')
        .select('plan, nome').eq('id', data.user.id).single()
      if (p?.plan !== 'premium') { router.push('/dashboard/pro'); return }
      setPlan(p.plan)
      setNome(p?.nome || data.user.email?.split('@')[0] || '')
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setAnalise(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const pad  = (n: number) => String(n).padStart(2, '0')
    const inicio = `${ano}-${pad(mes + 1)}-01`
    const fim    = `${ano}-${pad(mes + 1)}-31`

    const [txRes, metasRes] = await Promise.allSettled([
      supabase.from('transactions').select('*')
        .eq('user_id', user.id).gte('date', inicio).lte('date', fim),
      supabase.from('metas').select('*').eq('user_id', user.id),
    ])

    const txs   = txRes.status === 'fulfilled'    ? (txRes.value.data   ?? []) : []
    const goals = metasRes.status === 'fulfilled' ? (metasRes.value.data ?? []) : []

    const rec = txs.filter((t: any) => t.tipo === 'receita').reduce((s: number, t: any) => s + t.valor, 0)
    const gas = txs.filter((t: any) => t.tipo === 'gasto').reduce((s: number, t: any) => s + t.valor, 0)
    setReceitas(rec)
    setGastos(gas)

    const catMap: Record<string, number> = {}
    txs.filter((t: any) => t.tipo === 'gasto').forEach((t: any) => {
      catMap[t.categoria || 'Outros'] = (catMap[t.categoria || 'Outros'] || 0) + t.valor
    })
    setCategorias(
      Object.entries(catMap)
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6)
    )
    setMetas(goals.map((m: any) => ({
      nome: m.nome,
      pct: Math.min(100, Math.round(((m.valor_atual || 0) / (m.valor_meta || 1)) * 100)),
      cor: m.cor || '#00C853',
    })))
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { if (plan === 'premium') load() }, [plan, load])

  const prevMes = () => {
    if (mes === 0) { setMes(11); setAno(a => a - 1) } else setMes(m => m - 1)
  }
  const nextMes = () => {
    if (ano === now.getFullYear() && mes === now.getMonth()) return
    if (mes === 11) { setMes(0); setAno(a => a + 1) } else setMes(m => m + 1)
  }
  const isCurrentMes = ano === now.getFullYear() && mes === now.getMonth()

  const gerarAnalise = async () => {
    setGerandoIA(true)
    setIaError('')
    try {
      const res = await fetch('/api/relatorio/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: mes + 1, ano, receitas, gastos, sobra: receitas - gastos, categorias, metas, nome }),
      })
      const data = await res.json()
      if (data.error) { setIaError(data.error); return }
      setAnalise(data)
    } catch {
      setIaError('Algo deu errado ao gerar a análise — tente em instantes.')
    } finally {
      setGerandoIA(false)
    }
  }

  const sobra  = receitas - gastos
  const txRate = receitas > 0 ? Math.round((gastos / receitas) * 100) : 0

  if (!plan) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="rel-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }

        .rel-root {
          min-height: calc(100vh - 60px);
          background: #f4f7f4;
          font-family: 'Nunito', sans-serif;
        }

        /* ── Header ── */
        .rel-header {
          background: linear-gradient(135deg, #0a2e1a 0%, #1a3a1a 100%);
          padding: 28px 20px 44px;
        }
        .rel-header-inner { max-width: 720px; margin: 0 auto; }

        .rel-badge-row {
          display: flex; align-items: center; gap: 8px; margin-bottom: 18px;
        }

        .rel-month-nav {
          display: flex; align-items: center; gap: 12px;
        }
        .rel-month-btn {
          width: 38px; height: 38px; min-width: 38px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.2);
          background: transparent;
          color: #fff; font-size: 20px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          touch-action: manipulation;
        }
        .rel-month-btn:disabled { color: rgba(255,255,255,0.2); cursor: default; }
        .rel-month-title {
          font-size: clamp(20px, 6vw, 34px);
          font-weight: 900; color: #fff; margin: 0; line-height: 1.1;
          text-align: center;
        }

        /* ── Body ── */
        .rel-body {
          max-width: 720px;
          margin: -20px auto 0;
          padding: 0 14px 120px;
        }

        /* ── Cards 2×2 ── */
        .rel-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }
        .rel-card {
          border-radius: 14px;
          padding: 14px 12px;
          border: 1px solid #e8ede8;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .rel-card-label {
          font-size: 9px; font-weight: 800;
          color: #aaa; text-transform: uppercase;
          letter-spacing: 0.08em; margin: 0 0 5px;
        }
        .rel-card-value {
          font-size: clamp(13px, 3.8vw, 18px);
          font-weight: 900; margin: 0 0 3px; line-height: 1;
        }
        .rel-card-sub {
          font-size: 10px; color: #888; margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Section cards ── */
        .rel-section {
          background: #fff;
          border: 1px solid #e8ede8;
          border-radius: 16px;
          padding: 18px 16px;
          margin-bottom: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .rel-section-title {
          font-size: 11px; font-weight: 800;
          color: #1a3a1a; text-transform: uppercase;
          letter-spacing: 0.08em; margin: 0 0 14px;
        }

        /* ── AI header: stacks on narrow screens ── */
        .rel-ia-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .rel-ia-btn {
          background: #1a3a1a; color: #fff; border: none;
          border-radius: 10px; padding: 9px 16px;
          font-size: 12px; font-weight: 800;
          cursor: pointer; font-family: 'Nunito', sans-serif;
          display: flex; align-items: center; gap: 6px;
          white-space: nowrap; touch-action: manipulation;
        }
        .rel-ia-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Próximos passos ── */
        .rel-passo {
          display: flex; gap: 10px; align-items: flex-start;
          background: #f8fdf8; border-radius: 10px; padding: 10px 12px;
        }
        .rel-passo-num {
          width: 22px; height: 22px; min-width: 22px;
          background: #00C853; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 900; color: #fff;
        }

        /* ── Very small screens (< 360px) ── */
        @media (max-width: 359px) {
          .rel-header { padding: 20px 14px 36px; }
          .rel-body   { padding: 0 10px 120px; }
          .rel-cards  { gap: 8px; }
          .rel-card   { padding: 11px 9px; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="rel-header">
        <div className="rel-header-inner">
          <div className="rel-badge-row">
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>⭐ Premium</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Relatório Mensal</span>
          </div>
          <div className="rel-month-nav">
            <button className="rel-month-btn" onClick={prevMes}>‹</button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h1 className="rel-month-title">{MESES[mes]} {ano}</h1>
              {isCurrentMes && <span style={{ fontSize: 11, color: '#00C853', fontWeight: 700 }}>mês atual</span>}
            </div>
            <button className="rel-month-btn" onClick={nextMes} disabled={isCurrentMes}>›</button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="rel-body">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e4f5e9', borderTopColor: '#00C853', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* ── 4 Metric cards ── */}
            <div className="rel-cards">
              {[
                { label: 'Receitas', value: fmtShort(receitas), color: '#00C853', bg: '#f0fdf4', sub: 'entrou no mês' },
                { label: 'Gastos',   value: fmtShort(gastos),   color: '#ef4444', bg: '#fff5f5', sub: `${txRate}% da renda` },
                { label: sobra >= 0 ? 'Sobra' : 'Déficit', value: fmtShort(Math.abs(sobra)), color: sobra >= 0 ? '#1a3a1a' : '#ef4444', bg: '#fff', sub: sobra >= 0 ? '💚 economizado' : '⚠️ no vermelho' },
                { label: 'Top gasto', value: categorias[0]?.nome || '—', color: '#f59e0b', bg: '#fffbeb', sub: categorias[0] ? fmtShort(categorias[0].valor) : 'sem dados' },
              ].map(({ label, value, color, bg, sub }) => (
                <div key={label} className="rel-card" style={{ background: bg }}>
                  <p className="rel-card-label">{label}</p>
                  <p className="rel-card-value" style={{ color }}>{value}</p>
                  <p className="rel-card-sub">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Categorias ── */}
            {categorias.length > 0 && (
              <div className="rel-section">
                <p className="rel-section-title">Gastos por categoria</p>
                <ResponsiveContainer width="100%" height={categorias.length * 42}>
                  <BarChart data={categorias} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category" dataKey="nome" width={yAxisW}
                      tick={{ fontSize: 11, fill: '#555', fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}
                    />
                    <Tooltip formatter={(v: number) => fmt(v)} cursor={{ fill: '#f0fdf4' }} />
                    <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={20}>
                      {categorias.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Metas ── */}
            {metas.length > 0 && (
              <div className="rel-section">
                <p className="rel-section-title">Progresso das metas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {metas.map(m => (
                    <div key={m.nome}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a3a1a', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: m.cor, flexShrink: 0 }}>{m.pct}%</span>
                      </div>
                      <div style={{ height: 8, background: '#f0fdf4', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${m.pct}%`, background: m.cor, borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Análise IA ── */}
            <div className="rel-section" style={{ marginBottom: 0 }}>
              <div className="rel-ia-header">
                <p className="rel-section-title" style={{ margin: 0 }}>✨ Análise do Assessor</p>
                {!analise && (
                  <button className="rel-ia-btn" onClick={gerarAnalise} disabled={gerandoIA}>
                    {gerandoIA ? (
                      <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Gerando...</>
                    ) : '✦ Gerar análise'}
                  </button>
                )}
              </div>

              {iaError && <p style={{ fontSize: 13, color: '#ef4444', margin: '0 0 12px' }}>{iaError}</p>}

              {!analise && !gerandoIA && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#aaa' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
                  <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    Toque em "Gerar análise" para receber a avaliação do seu mês pelo Assessor IA.
                  </p>
                </div>
              )}

              {analise && (
                <div>
                  <div style={{ borderLeft: '3px solid #00C853', paddingLeft: 12, marginBottom: 18 }}>
                    {analise.narrativa.split('\n\n').map((p, i) => (
                      <p key={i} style={{ fontSize: 14, color: '#333', lineHeight: 1.7, margin: i === 0 ? 0 : '10px 0 0' }}>{p}</p>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#1a3a1a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Próximos passos</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analise.proximos_passos.map((passo, i) => (
                      <div key={i} className="rel-passo">
                        <span className="rel-passo-num">{i + 1}</span>
                        <span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{passo}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={gerarAnalise} disabled={gerandoIA}
                    style={{ marginTop: 16, background: 'transparent', border: '1px solid #e8ede8', borderRadius: 8, padding: '7px 14px', fontSize: 11, color: '#aaa', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', touchAction: 'manipulation' }}>
                    🔄 Regerar análise
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
