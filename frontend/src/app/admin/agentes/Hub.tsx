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

const AGENT_COR: Record<string, string> = {
  seo: '#378ADD',
  conteudo: '#1D9E75',
  growth: '#7F77DD',
  dados: '#EF9F27',
  dev: '#D85A30',
}

const AGENT_LABEL: Record<string, string> = {
  seo: 'SEO',
  conteudo: 'MKT',
  growth: 'GRW',
  dados: 'DAD',
  dev: 'DEV',
}

const STATUS_COR: Record<string, string> = {
  pendente: '#aaa',
  executando: '#EF9F27',
  concluido: '#1D9E75',
  erro: '#D85A30',
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  executando: 'Executando...',
  concluido: 'Concluído',
  erro: 'Erro',
}

export default function Hub() {
  const [missoes, setMissoes] = useState<Missao[]>([])
  const [loading, setLoading] = useState(true)
  const [executando, setExecutando] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Record<string, string>>({})

  const carregarMissoes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/hub')
      const data = await res.json()
      setMissoes(data.missoes ?? [])
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { carregarMissoes() }, [carregarMissoes])

  async function executarMissao(missao: Missao) {
    if (executando) return
    setExecutando(missao.id)
    setResultados(prev => ({ ...prev, [missao.id]: 'Executando...' }))

    try {
      const res = await fetch('/api/admin/hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missao_id: missao.id, agent_id: missao.agent_id, prompt: missao.prompt }),
      })
      const data = await res.json()
      setResultados(prev => ({ ...prev, [missao.id]: data.resultado ?? 'Concluído' }))
      await carregarMissoes()
    } catch {
      setResultados(prev => ({ ...prev, [missao.id]: 'Erro ao executar' }))
    } finally {
      setExecutando(null)
    }
  }

  async function executarTodos() {
    for (const missao of missoes.filter(m => m.status !== 'executando')) {
      await executarMissao(missao)
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  const agentes = [...new Set(missoes.map(m => m.agent_id))]
  const totalConcluidas = missoes.filter(m => m.status === 'concluido').length
  const totalPendentes = missoes.filter(m => m.status === 'pendente').length

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Nunito',sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Hub de Missões</div>
          <div style={{ fontSize: 13, color: '#888' }}>Agentes trabalhando para crescer a iMoney</div>
        </div>
        <button onClick={executarTodos} disabled={!!executando}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: executando ? '#e8ede8' : '#1D9E75', color: executando ? '#aaa' : '#fff', fontSize: 13, fontWeight: 700, cursor: executando ? 'not-allowed' : 'pointer' }}>
          {executando ? 'Executando...' : '▶ Executar todos'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Missões ativas', valor: missoes.length, cor: '#1D9E75' },
          { label: 'Concluídas hoje', valor: totalConcluidas, cor: '#085041' },
          { label: 'Pendentes', valor: totalPendentes, cor: '#EF9F27' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.cor }}>{s.valor}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Missões por agente */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#aaa' }}>Carregando missões...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {agentes.map(agentId => {
            const cor = AGENT_COR[agentId] || '#888'
            const missoesDeste = missoes.filter(m => m.agent_id === agentId)
            return (
              <div key={agentId} style={{ background: '#fff', border: `1px solid ${cor}22`, borderRadius: 14, overflow: 'hidden' }}>
                {/* Header do agente */}
                <div style={{ background: cor + '10', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${cor}22` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: cor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: cor, letterSpacing: '0.05em' }}>
                    {AGENT_LABEL[agentId] || agentId.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', textTransform: 'capitalize' }}>
                    Agente {agentId}
                  </div>
                  <span style={{ fontSize: 11, color: cor, background: cor + '15', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                    {missoesDeste.length} missão{missoesDeste.length !== 1 ? 'ões' : ''}
                  </span>
                </div>

                {/* Lista de missões */}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {missoesDeste.map(missao => {
                    const isExecutando = executando === missao.id
                    const resultado = resultados[missao.id]
                    const statusAtual = isExecutando ? 'executando' : missao.status
                    return (
                      <div key={missao.id} style={{ background: '#f8f9f8', borderRadius: 10, padding: '12px 14px', border: `1px solid ${STATUS_COR[statusAtual]}22` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{missao.titulo}</span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COR[statusAtual], background: STATUS_COR[statusAtual] + '18', padding: '1px 7px', borderRadius: 20 }}>
                                {STATUS_LABEL[statusAtual]}
                              </span>
                              <span style={{ fontSize: 10, color: '#bbb', background: '#f0f0f0', padding: '1px 7px', borderRadius: 20 }}>
                                {missao.frequencia}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, marginBottom: resultado ? 8 : 0 }}>
                              {missao.descricao}
                            </div>
                            {resultado && (
                              <div style={{ fontSize: 11, color: '#444', background: '#fff', border: '1px solid #e8ede8', borderRadius: 8, padding: '6px 10px', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                                {resultado}
                              </div>
                            )}
                            {missao.ultima_execucao && (
                              <div style={{ fontSize: 10, color: '#bbb', marginTop: 6 }}>
                                Última execução: {new Date(missao.ultima_execucao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                {missao.execucoes_total > 0 && ` · ${missao.execucoes_total}x executada`}
                              </div>
                            )}
                          </div>
                          <button onClick={() => executarMissao(missao)} disabled={!!executando}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: executando ? 'not-allowed' : 'pointer', flexShrink: 0, background: isExecutando ? '#EF9F2720' : cor + '15', color: isExecutando ? '#EF9F27' : cor, transition: 'all .2s', whiteSpace: 'nowrap' }}>
                            {isExecutando ? '⟳ Executando' : '▶ Executar'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
