'use client'

import { useState, useEffect, useCallback } from 'react'

interface Item {
  id: string
  agent_id: string
  tipo: string
  titulo: string
  conteudo: string
  metadata: Record<string, string>
  status: string
  criado_em: string
}

const TIPO_COR: Record<string, string> = {
  post: '#534AB7',
  email: '#1D9E75',
  artigo: '#378ADD',
  codigo: '#D85A30',
  campanha: '#7F77DD',
}

const TIPO_ICON: Record<string, string> = {
  post: '📱',
  email: '📧',
  artigo: '📝',
  codigo: '💻',
  campanha: '📣',
}

const AGENT_COR: Record<string, string> = {
  seo: '#378ADD',
  conteudo: '#1D9E75',
  growth: '#7F77DD',
  dados: '#EF9F27',
  dev: '#D85A30',
}

export default function ApprovalQueue() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'pendente' | 'aprovado' | 'rejeitado'>('pendente')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [processando, setProcessando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/aprovacao?status=' + filtro)
      const data = await res.json()
      setItems(data.items ?? [])
    } catch { } finally { setLoading(false) }
  }, [filtro])

  useEffect(() => { carregar() }, [carregar])

  async function acao(id: string, tipo: 'aprovar' | 'rejeitar', motivo?: string) {
    setProcessando(id)
    try {
      await fetch('/api/admin/aprovacao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, acao: tipo, motivo }),
      })
      await carregar()
    } catch { } finally { setProcessando(null) }
  }

  const pendentes = items.filter(i => i.status === 'pendente').length

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Nunito',sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            Fila de aprovação
            {pendentes > 0 && (
              <span style={{ background: '#D85A30', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                {pendentes} pendente{pendentes !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>Revise e aprove o que os agentes geraram</div>
        </div>
        <button onClick={carregar} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e8ede8', background: '#fff', fontSize: 12, fontWeight: 600, color: '#666', cursor: 'pointer' }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['pendente', 'aprovado', 'rejeitado'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: '6px 16px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: filtro === f ? '#1D9E75' : '#f0f0f0', color: filtro === f ? '#fff' : '#666', textTransform: 'capitalize' }}>
            {f === 'pendente' ? '⏳ Pendente' : f === 'aprovado' ? '✓ Aprovado' : '✕ Rejeitado'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#aaa' }}>Carregando...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{filtro === 'pendente' ? '🎉' : '📭'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
            {filtro === 'pendente' ? 'Nenhum item pendente' : `Nenhum item ${filtro}`}
          </div>
          <div style={{ fontSize: 12, color: '#aaa' }}>
            {filtro === 'pendente' ? 'Os agentes ainda não geraram conteúdo para revisar.' : 'Execute missões para gerar conteúdo.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const cor = TIPO_COR[item.tipo] || '#888'
            const agenteCor = AGENT_COR[item.agent_id] || '#888'
            const exp = expandido === item.id
            return (
              <div key={item.id} style={{ background: '#fff', border: `1px solid ${cor}22`, borderRadius: 14, overflow: 'hidden' }}>
                {/* Header do card */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: cor + '06' }} onClick={() => setExpandido(exp ? null : item.id)}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{TIPO_ICON[item.tipo] || '📄'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>{item.titulo}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: cor, background: cor + '18', padding: '1px 7px', borderRadius: 20, flexShrink: 0 }}>{item.tipo}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: agenteCor, background: agenteCor + '15', padding: '1px 7px', borderRadius: 20, flexShrink: 0 }}>Agente {item.agent_id}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>
                      {new Date(item.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {item.status === 'pendente' && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); acao(item.id, 'aprovar') }} disabled={processando === item.id}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#E1F5EE', color: '#085041', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {processando === item.id ? '...' : '✓ Aprovar'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); acao(item.id, 'rejeitar') }} disabled={processando === item.id}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#ffeef0', color: '#D85A30', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  )}
                  {item.status !== 'pendente' && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.status === 'aprovado' ? '#1D9E75' : '#D85A30', background: (item.status === 'aprovado' ? '#E1F5EE' : '#ffeef0'), padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>
                      {item.status === 'aprovado' ? '✓ Aprovado' : '✕ Rejeitado'}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: '#bbb', flexShrink: 0 }}>{exp ? '▲' : '▼'}</span>
                </div>

                {/* Conteúdo expandido */}
                {exp && (
                  <div style={{ padding: '14px 16px', borderTop: `1px solid ${cor}15` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 8 }}>CONTEÚDO GERADO</div>
                    <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, background: '#f8f9f8', borderRadius: 8, padding: '12px 14px', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', fontFamily: item.tipo === 'codigo' ? 'monospace' : 'inherit' }}>
                      {item.conteudo}
                    </div>
                    {Object.keys(item.metadata || {}).length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(item.metadata).map(([k, v]) => (
                          <div key={k} style={{ fontSize: 11, color: '#666', background: '#f0f0f0', padding: '3px 10px', borderRadius: 20 }}>
                            <strong>{k}:</strong> {v}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.status === 'pendente' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <button onClick={() => acao(item.id, 'aprovar')} disabled={!!processando}
                          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          ✓ Aprovar e publicar
                        </button>
                        <button onClick={() => acao(item.id, 'rejeitar')} disabled={!!processando}
                          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#ffeef0', color: '#D85A30', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          ✕ Rejeitar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
