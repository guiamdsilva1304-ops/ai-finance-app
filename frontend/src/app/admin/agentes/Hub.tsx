'use client'

import { useState, useEffect, useCallback } from 'react'

interface Missao {
  id: string
  agent_id: string
  titulo: string
  descricao: string
  prompt: string
  frequencia: string
  status: string
  ultimo_resultado?: string
  ultima_execucao?: string
  proxima_execucao?: string
  execucoes_total: number
}

interface Metricas {
  total_usuarios: number
  novos_semana: number
  novos_hoje: number
  artigos_publicados: number
  artigos_semana: number
  emails_enviados: number
  aprovacoes_pendentes: number
  missoes_concluidas: number
  pagantes: number
  mrr: number
  break_even: number
  progresso_break_even: number
}

const AGENT_CONFIG: Record<string, { cor: string; bg: string; label: string; icon: string }> = {
  seo:    { cor: '#378ADD', bg: '#EBF4FF', label: 'SEO', icon: '🔍' },
  growth: { cor: '#7F77DD', bg: '#F0EFFF', label: 'GRW', icon: '🚀' },
}

const ACTIVE_AGENTS = ['seo', 'growth']

const STATUS_CONFIG: Record<string, { cor: string; bg: string; label: string; dot: string }> = {
  pendente:   { cor: '#888',    bg: '#f5f5f5', label: 'Pendente',    dot: '○' },
  executando: { cor: '#EF9F27', bg: '#FFF8EC', label: 'Executando',  dot: '◉' },
  concluido:  { cor: '#1D9E75', bg: '#E1F5EE', label: 'Concluído',   dot: '●' },
  erro:       { cor: '#D85A30', bg: '#FFEDE8', label: 'Erro',        dot: '✕' },
}

export default function Hub() {
  const [dataAtual, setDataAtual] = useState('')
  const [missoes, setMissoes] = useState<Missao[]>([])
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [executando, setExecutando] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Record<string, string>>({})
  const [expandido, setExpandido] = useState<string | null>(null)

    useEffect(() => {
    setDataAtual(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }))
  }, [])

  const carregar = useCallback(async () => {
    try {
      const [mRes, metrRes] = await Promise.all([
        fetch('/api/admin/hub', { credentials: 'include', credentials: 'include' }),
        fetch('/api/admin/metricas', { credentials: 'include' }),
      ])
      const mData = await mRes.json()
      const metrData = await metrRes.json()
      setMissoes(mData.missoes ?? [])
      if (!metrData.error) setMetricas(metrData)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function executarMissao(missao: Missao) {
    if (executando) return
    setExecutando(missao.id)
    setResultados(prev => ({ ...prev, [missao.id]: '⟳ Executando...' }))
    try {
      const res = await fetch('/api/admin/hub', { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missao_id: missao.id, agent_id: missao.agent_id, prompt: missao.prompt }),
      })
      const data = await res.json()
      setResultados(prev => ({ ...prev, [missao.id]: data.resultado ?? '✓ Concluído' }))
      await carregar()
    } catch {
      setResultados(prev => ({ ...prev, [missao.id]: '✕ Erro ao executar' }))
    } finally { setExecutando(null) }
  }

  async function executarTodos() {
    for (const missao of missoes) {
      await executarMissao(missao)
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  const missoesFiltradas = missoes.filter(m => ACTIVE_AGENTS.includes(m.agent_id))
  const agentes = [...new Set(missoesFiltradas.map(m => m.agent_id))]
  const concluidas = missoesFiltradas.filter(m => m.status === 'concluido').length
  const pendentes = missoesFiltradas.filter(m => m.status === 'pendente').length
  const pctBreakEven = metricas ? Math.min(100, Math.round((metricas.pagantes / metricas.break_even) * 100)) : 0
  const pctBlog = metricas ? Math.min(100, Math.round((metricas.artigos_publicados / 10) * 100)) : 0

  return (
    <div style={{ padding: '20px 24px', fontFamily: "'Nunito',sans-serif", minHeight: '100%', background: '#f8f9f8' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0d2414', letterSpacing: '-0.02em' }}>
            ⚡ Hub de Missões
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            Agentes trabalhando para crescer a iMoney — {dataAtual}
          </div>
        </div>
        <button onClick={executarTodos} disabled={!!executando}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: 'none', background: executando ? '#e8ede8' : 'linear-gradient(135deg,#0a3d28,#1D9E75)', color: executando ? '#aaa' : '#fff', fontSize: 13, fontWeight: 700, cursor: executando ? 'not-allowed' : 'pointer', transition: 'all .2s' }}>
          {executando ? '⟳ Executando...' : '▶ Executar todos'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'MRR', valor: `R$ ${(metricas?.mrr ?? 0).toFixed(0)}`, sub: `${metricas?.pagantes ?? 0} pagantes`, cor: '#1D9E75', destaque: true },
          { label: 'Usuários', valor: metricas?.total_usuarios ?? '—', sub: `+${metricas?.novos_semana ?? 0} esta semana`, cor: '#378ADD', destaque: false },
          { label: 'Novos hoje', valor: metricas?.novos_hoje ?? '—', sub: 'cadastros', cor: '#7F77DD', destaque: false },
          { label: 'Artigos', valor: metricas?.artigos_publicados ?? '—', sub: `+${metricas?.artigos_semana ?? 0} esta semana`, cor: '#085041', destaque: false },
          { label: 'Missões ✓', valor: concluidas, sub: `${pendentes} pendentes`, cor: '#EF9F27', destaque: false },
          { label: 'Aprovações', valor: metricas?.aprovacoes_pendentes ?? 0, sub: 'aguardando review', cor: metricas?.aprovacoes_pendentes ? '#D85A30' : '#aaa', destaque: false },
        ].map(k => (
          <div key={k.label} style={{
            background: k.destaque ? 'linear-gradient(135deg,#0a3d28,#1D9E75)' : '#fff',
            border: k.destaque ? 'none' : `1px solid ${k.cor}22`,
            borderRadius: 12, padding: '12px 14px',
            boxShadow: k.destaque ? '0 4px 16px rgba(29,158,117,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: k.destaque ? 'rgba(255,255,255,0.7)' : '#aaa', letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: k.destaque ? '#fff' : k.cor, lineHeight: 1 }}>{k.valor}</div>
            <div style={{ fontSize: 10, color: k.destaque ? 'rgba(255,255,255,0.6)' : '#aaa', marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: '1px solid #e8ede8' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Progresso para break-even</div>
        {[
          { label: `Pagantes ${metricas?.pagantes ?? 0}/${metricas?.break_even ?? 22}`, pct: pctBreakEven, cor: '#1D9E75' },
          { label: `Blog ${metricas?.artigos_publicados ?? 0}/10 artigos`, pct: pctBlog, cor: '#378ADD' },
          { label: `Missões ${concluidas}/${missoes.length} executadas`, pct: missoes.length ? Math.round((concluidas / missoes.length) * 100) : 0, cor: '#7F77DD' },
        ].map(p => (
          <div key={p.label} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: '#666', fontWeight: 600 }}>{p.label}</span>
              <span style={{ color: p.cor, fontWeight: 700 }}>{p.pct}%</span>
            </div>
            <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${p.pct}%`, background: p.cor, borderRadius: 3, transition: 'width 1s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Missões por agente */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#aaa' }}>Carregando missões...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {agentes.map(agentId => {
            const cfg = AGENT_CONFIG[agentId] || { cor: '#888', bg: '#f5f5f5', label: agentId.toUpperCase(), icon: '🤖' }
            const missoesDeste = missoesFiltradas.filter(m => m.agent_id === agentId)
            const todosConcluidos = missoesDeste.every(m => m.status === 'concluido')

            return (
              <div key={agentId} style={{ background: '#fff', border: `1px solid ${cfg.cor}22`, borderRadius: 14, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ background: cfg.bg, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${cfg.cor}18` }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: cfg.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0d2414', textTransform: 'capitalize' }}>Agente {agentId}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{missoesDeste.length} missão{missoesDeste.length !== 1 ? 'ões' : ''} · {missoesDeste.filter(m => m.status === 'concluido').length} concluída{missoesDeste.filter(m => m.status === 'concluido').length !== 1 ? 's' : ''}</div>
                  </div>
                  {todosConcluidos && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#E1F5EE', padding: '3px 10px', borderRadius: 20 }}>✓ Tudo ok</div>
                  )}
                </div>

                {/* Missões */}
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {missoesDeste.map(missao => {
                    const isExec = executando === missao.id
                    const statusKey = isExec ? 'executando' : missao.status
                    const stCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pendente
                    const resultado = resultados[missao.id]
                    const exp = expandido === missao.id

                    return (
                      <div key={missao.id} style={{ border: `1px solid ${stCfg.cor}20`, borderRadius: 10, overflow: 'hidden', transition: 'all .2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', background: stCfg.bg + '40' }}
                          onClick={() => setExpandido(exp ? null : missao.id)}>
                          <div style={{ fontSize: 14, color: stCfg.cor, flexShrink: 0, animation: isExec ? 'spin 1s linear infinite' : 'none' }}>
                            {stCfg.dot}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414', marginBottom: 2 }}>{missao.titulo}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: stCfg.cor, background: stCfg.bg, padding: '1px 7px', borderRadius: 20 }}>{stCfg.label}</span>
                              <span style={{ fontSize: 10, color: '#bbb', background: '#f5f5f5', padding: '1px 7px', borderRadius: 20 }}>{missao.frequencia}</span>
                              {missao.execucoes_total > 0 && (
                                <span style={{ fontSize: 10, color: '#bbb', background: '#f5f5f5', padding: '1px 7px', borderRadius: 20 }}>{missao.execucoes_total}x executada</span>
                              )}
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); executarMissao(missao) }} disabled={!!executando}
                            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: executando ? 'not-allowed' : 'pointer', flexShrink: 0, background: isExec ? '#FFF8EC' : cfg.bg, color: isExec ? '#EF9F27' : cfg.cor, transition: 'all .2s' }}>
                            {isExec ? '⟳' : '▶'}
                          </button>
                          <span style={{ fontSize: 10, color: '#ccc' }}>{exp ? '▲' : '▼'}</span>
                        </div>

                        {exp && (
                          <div style={{ padding: '10px 12px', borderTop: `1px solid ${stCfg.cor}15`, background: '#fafafa' }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 8, lineHeight: 1.6 }}>{missao.descricao}</div>
                            {(resultado || missao.ultimo_resultado) && (
                              <div style={{ fontSize: 11, color: '#444', background: '#fff', border: '1px solid #e8ede8', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', fontFamily: 'monospace' }}>
                                {resultado || missao.ultimo_resultado}
                              </div>
                            )}
                            {missao.ultima_execucao && (
                              <div style={{ fontSize: 10, color: '#bbb', marginTop: 6 }}>
                                Última execução: {new Date(missao.ultima_execucao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
