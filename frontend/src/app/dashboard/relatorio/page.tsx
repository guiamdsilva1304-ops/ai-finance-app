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

export default function RelatorioPage() {
  const router  = useRouter()
  const supabase = createSupabaseBrowser()

  const now  = new Date()
  const [mes,  setMes]  = useState(now.getMonth())
  const [ano,  setAno]  = useState(now.getFullYear())
  const [plan, setPlan] = useState<string | null>(null)
  const [nome, setNome] = useState('')

  const [receitas,    setReceitas]    = useState(0)
  const [gastos,      setGastos]      = useState(0)
  const [categorias,  setCategorias]  = useState<{ nome: string; valor: number }[]>([])
  const [metas,       setMetas]       = useState<{ nome: string; pct: number; cor: string }[]>([])
  const [loading,     setLoading]     = useState(true)

  const [analise,     setAnalise]     = useState<{ narrativa: string; proximos_passos: string[] } | null>(null)
  const [gerandoIA,   setGerandoIA]   = useState(false)
  const [iaError,     setIaError]     = useState('')

  // Gate premium
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: p } = await supabase.from('user_profiles')
        .select('plan, nome, full_name').eq('id', data.user.id).single()
      if (p?.plan !== 'premium') { router.push('/dashboard/pro'); return }
      setPlan(p.plan)
      setNome(p?.full_name || p?.nome || data.user.email?.split('@')[0] || '')
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setAnalise(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const inicio = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
    const fim    = `${ano}-${String(mes + 1).padStart(2, '0')}-31`

    const [txRes, metasRes] = await Promise.allSettled([
      supabase.from('transactions').select('*')
        .eq('user_id', user.id).gte('date', inicio).lte('date', fim),
      supabase.from('metas').select('*').eq('user_id', user.id),
    ])

    const txs   = txRes.status === 'fulfilled' ? (txRes.value.data ?? []) : []
    const goals = metasRes.status === 'fulfilled' ? (metasRes.value.data ?? []) : []

    const rec  = txs.filter((t: any) => t.tipo === 'receita').reduce((s: number, t: any) => s + t.valor, 0)
    const gas  = txs.filter((t: any) => t.tipo === 'gasto').reduce((s: number, t: any) => s + t.valor, 0)
    setReceitas(rec)
    setGastos(gas)

    // Categorias
    const catMap: Record<string, number> = {}
    txs.filter((t: any) => t.tipo === 'gasto').forEach((t: any) => {
      catMap[t.categoria || 'Outros'] = (catMap[t.categoria || 'Outros'] || 0) + t.valor
    })
    const cats = Object.entries(catMap)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6)
    setCategorias(cats)

    // Metas
    const ms = goals.map((m: any) => ({
      nome: m.nome,
      pct: Math.min(100, Math.round(((m.valor_atual || 0) / (m.valor_meta || 1)) * 100)),
      cor: m.cor || '#00C853',
    }))
    setMetas(ms)
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { if (plan === 'premium') load() }, [plan, load])

  const prevMes = () => {
    if (mes === 0) { setMes(11); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }
  const nextMes = () => {
    const d = new Date()
    if (ano === d.getFullYear() && mes === d.getMonth()) return
    if (mes === 11) { setMes(0); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }
  const isCurrentMes = ano === now.getFullYear() && mes === now.getMonth()

  const gerarAnalise = async () => {
    setGerandoIA(true)
    setIaError('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/relatorio/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          mes: mes + 1, ano, receitas, gastos,
          sobra: receitas - gastos,
          categorias, metas, nome,
        }),
      })
      const data = await res.json()
      if (data.error) { setIaError(data.error); return }
      setAnalise(data)
    } catch {
      setIaError('Erro ao gerar análise. Tente novamente.')
    } finally {
      setGerandoIA(false)
    }
  }

  const sobra   = receitas - gastos
  const txRate  = receitas > 0 ? Math.round((gastos / receitas) * 100) : 0

  if (!plan) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: '#f4f7f4', fontFamily: "'Nunito', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #0a2e1a 0%, #1a3a1a 100%)', padding: '32px 24px 48px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>⭐ Premium</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Relatório Mensal</span>
          </div>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={prevMes} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h1 style={{ fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.1 }}>
                {MESES[mes]} {ano}
              </h1>
              {isCurrentMes && <span style={{ fontSize: 11, color: '#00C853', fontWeight: 700 }}>mês atual</span>}
            </div>
            <button onClick={nextMes} disabled={isCurrentMes}
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: isCurrentMes ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 18, cursor: isCurrentMes ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '-24px auto 0', padding: '0 16px 80px' }}>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e4f5e9', borderTopColor: '#00C853', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <>
            {/* ── 4 Metric cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Receitas', value: fmt(receitas), color: '#00C853', bg: '#f0fdf4', sub: 'entrou no mês' },
                { label: 'Gastos',   value: fmt(gastos),   color: '#ef4444', bg: '#fff5f5', sub: `${txRate}% da renda` },
                { label: sobra >= 0 ? 'Sobra' : 'Déficit', value: fmt(Math.abs(sobra)), color: sobra >= 0 ? '#1a3a1a' : '#ef4444', bg: '#fff', sub: sobra >= 0 ? '💚 você economizou' : '⚠️ gastou mais que ganhou' },
                { label: 'Top gasto', value: categorias[0]?.nome || '—', color: '#f59e0b', bg: '#fffbeb', sub: categorias[0] ? fmt(categorias[0].valor) : 'sem dados' },
              ].map(({ label, value, color, bg, sub }) => (
                <div key={label} style={{ background: bg, border: '1px solid #e8ede8', borderRadius: 16, padding: '16px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{label}</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color, margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Categorias ── */}
            {categorias.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#1a3a1a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gastos por categoria</p>
                <ResponsiveContainer width="100%" height={categorias.length * 44}>
                  <BarChart data={categorias} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 12, fill: '#444', fontFamily: 'Nunito, sans-serif', fontWeight: 600 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} cursor={{ fill: '#f0fdf4' }} />
                    <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={22}>
                      {categorias.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Metas ── */}
            {metas.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#1a3a1a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progresso das metas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {metas.map(m => (
                    <div key={m.nome}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a3a1a' }}>{m.nome}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: m.cor }}>{m.pct}%</span>
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
            <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#1a3a1a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>✨ Análise do Assessor</p>
                {!analise && (
                  <button onClick={gerarAnalise} disabled={gerandoIA}
                    style={{ background: '#1a3a1a', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: gerandoIA ? 'not-allowed' : 'pointer', opacity: gerandoIA ? 0.6 : 1, fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {gerandoIA ? (
                      <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Gerando...</>
                    ) : '✦ Gerar análise'}
                  </button>
                )}
              </div>

              {iaError && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{iaError}</p>}

              {!analise && !gerandoIA && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
                  <p style={{ fontSize: 13, margin: 0 }}>Clique em "Gerar análise" para receber a avaliação do seu mês pelo Assessor IA.</p>
                </div>
              )}

              {analise && (
                <div>
                  <div style={{ borderLeft: '3px solid #00C853', paddingLeft: 14, marginBottom: 20 }}>
                    {analise.narrativa.split('\n\n').map((p, i) => (
                      <p key={i} style={{ fontSize: 14, color: '#333', lineHeight: 1.7, margin: i === 0 ? 0 : '12px 0 0' }}>{p}</p>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#1a3a1a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Próximos passos</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analise.proximos_passos.map((passo, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#f8fdf8', borderRadius: 10, padding: '10px 12px' }}>
                        <span style={{ width: 22, height: 22, minWidth: 22, background: '#00C853', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff' }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{passo}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={gerarAnalise} disabled={gerandoIA}
                    style={{ marginTop: 16, background: 'transparent', border: '1px solid #e8ede8', borderRadius: 8, padding: '6px 14px', fontSize: 11, color: '#aaa', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
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
