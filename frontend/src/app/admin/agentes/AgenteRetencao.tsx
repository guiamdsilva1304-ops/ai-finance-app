'use client'

import { useState, useEffect } from 'react'

type GatilhoTipo = 'meta_orfa' | 'score_critico' | 'estagnacao' | 'quase_la'

interface Gatilho {
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

interface Resultado {
  email: string
  gatilho: string
  subject: string
  preview: string
}

const GATILHO_CONF: Record<GatilhoTipo, {
  label: string; icon: string; cor: string; bg: string; desc: string
}> = {
  meta_orfa:     { label: 'Meta Órfã',       icon: '🎯', cor: '#F59E0B', bg: '#FFF7ED', desc: 'Tem meta mas nunca usou o Assessor' },
  score_critico: { label: 'Score Crítico',    icon: '⚠️', cor: '#EF4444', bg: '#FEF2F2', desc: 'Score ≤45 sem retorno em 3+ dias' },
  estagnacao:    { label: 'Estagnação',       icon: '😴', cor: '#8B5CF6', bg: '#F5F3FF', desc: 'Engajado mas parou há 7-20 dias' },
  quase_la:      { label: 'Quase Lá',        icon: '🔥', cor: '#1D9E75', bg: '#F0FDF4', desc: 'Meta 40-92% sem aporte em 5+ dias' },
}

function ContextoBadge({ g }: { g: Gatilho }) {
  const ctx = g.contexto
  if (g.gatilho === 'meta_orfa')
    return <span style={{ fontSize: 11, color: '#6b7280' }}>Meta: {ctx.meta_nome}</span>
  if (g.gatilho === 'score_critico')
    return <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>Score {ctx.score}/100 · {ctx.dias_sem_login}d sem login</span>
  if (g.gatilho === 'estagnacao')
    return <span style={{ fontSize: 11, color: '#6b7280' }}>{ctx.total_msgs} msgs · {ctx.dias_sem_login}d afastado {ctx.meta_nome ? `· ${ctx.meta_nome} ${ctx.meta_pct ?? 0}%` : ''}</span>
  if (g.gatilho === 'quase_la')
    return (
      <span style={{ fontSize: 11, color: '#1D9E75', fontWeight: 700 }}>
        {ctx.meta_nome} · {ctx.meta_pct}% concluído · {ctx.dias_sem_aporte}d sem aporte
      </span>
    )
  return null
}

export default function AgenteRetencao() {
  const [loading, setLoading] = useState(false)
  const [executando, setExecutando] = useState<string | null>(null)
  const [gatilhos, setGatilhos] = useState<Gatilho[]>([])
  const [resumo, setResumo] = useState<Record<string, number> | null>(null)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [erros, setErros] = useState<Array<{ email: string; erro: string }>>([])
  const [erro, setErro] = useState('')


  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/agentes/retencao', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGatilhos(data.gatilhos)
      setResumo(data.resumo)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  async function executar(gatilho: GatilhoTipo | 'todos') {
    setExecutando(gatilho)
    setResultados([])
    setErros([])
    setErro('')
    try {
      const res = await fetch('/api/admin/agentes/retencao', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatilho }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResultados(data.resultados || [])
      setErros(data.erros || [])
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao executar')
    } finally {
      setExecutando(null)
    }
  }

  useEffect(() => { carregar() }, [])

  // Agrupar gatilhos por tipo
  const porTipo = (tipo: GatilhoTipo) => gatilhos.filter(g => g.gatilho === tipo)

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#0a3d28,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧲</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0d2414' }}>Agente de Retenção</div>
            <div style={{ fontSize: 12, color: '#6b9e80', fontWeight: 600 }}>Age por comportamento, não por tempo</div>
          </div>
        </div>
        <button onClick={carregar} disabled={loading}
          style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e4f5e9', background: '#fff', fontSize: 13, fontWeight: 700, color: '#1D9E75', cursor: 'pointer' }}>
          {loading ? '...' : '↻ Atualizar'}
        </button>
      </div>

      {erro && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#EF4444', marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {/* KPIs por gatilho */}
      {resumo && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
          {(Object.keys(GATILHO_CONF) as GatilhoTipo[]).map(tipo => {
            const cfg = GATILHO_CONF[tipo]
            const count = resumo[tipo] ?? 0
            return (
              <div key={tipo} style={{ background: cfg.bg, border: `1.5px solid ${cfg.cor}33`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.cor }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: cfg.cor, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>{cfg.desc}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Seções por gatilho */}
      {(Object.keys(GATILHO_CONF) as GatilhoTipo[]).map(tipo => {
        const cfg = GATILHO_CONF[tipo]
        const lista = porTipo(tipo)
        if (lista.length === 0) return null

        return (
          <div key={tipo} style={{ background: '#fff', border: `1.5px solid ${cfg.cor}22`, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '12px 18px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: cfg.cor }}>{cfg.label} ({lista.length})</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{cfg.desc}</span>
              </div>
              <button
                onClick={() => executar(tipo)}
                disabled={!!executando}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: cfg.cor, color: '#fff', fontSize: 12, fontWeight: 700, cursor: executando ? 'wait' : 'pointer', fontFamily: 'Nunito, sans-serif' }}>
                {executando === tipo ? 'Enviando...' : '📧 Agir'}
              </button>
            </div>
            {lista.map(g => (
              <div key={g.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: `1px solid ${cfg.cor}11` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414' }}>
                    {g.nome} <span style={{ fontWeight: 400, color: '#9ca3af' }}>· {g.email}</span>
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <ContextoBadge g={g} />
                  </div>
                </div>
                {g.gatilho === 'quase_la' && g.contexto.meta_pct && (
                  <div style={{ width: 48, height: 48, flexShrink: 0 }}>
                    <svg viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="24" cy="24" r="20" fill="none" stroke="#f0f0f0" strokeWidth="4" />
                      <circle cx="24" cy="24" r="20" fill="none" stroke={cfg.cor} strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 20 * g.contexto.meta_pct / 100} ${2 * Math.PI * 20}`}
                        strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {/* Botão rodar tudo */}
      {gatilhos.length > 0 && (
        <button onClick={() => executar('todos')} disabled={!!executando}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: executando === 'todos' ? '#1D9E75' : 'linear-gradient(135deg,#0a3d28,#1D9E75)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: executando ? 'wait' : 'pointer', fontFamily: 'Nunito, sans-serif', boxShadow: '0 4px 20px rgba(29,158,117,0.3)', marginBottom: 16 }}>
          {executando === 'todos' ? '⚡ Enviando para todos...' : `⚡ Agir em todos os ${gatilhos.length} gatilhos`}
        </button>
      )}

      {gatilhos.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Nenhum gatilho ativo</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Todos os usuários estão engajados ou já foram acionados</div>
        </div>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#14532D', marginBottom: 10 }}>
            ✅ {resultados.length} email{resultados.length !== 1 ? 's' : ''} enviado{resultados.length !== 1 ? 's' : ''}
          </div>
          {resultados.map((r, i) => {
            const cfg = GATILHO_CONF[r.gatilho as GatilhoTipo]
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg?.cor, background: cfg?.bg, padding: '2px 8px', borderRadius: 6 }}>
                    {cfg?.icon} {cfg?.label}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{r.email}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414' }}>{r.subject}</div>
                <div style={{ fontSize: 12, color: '#6b9e80', marginTop: 2 }}>{r.preview}…</div>
              </div>
            )
          })}
        </div>
      )}

      {erros.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 6 }}>⚠️ {erros.length} erro(s)</div>
          {erros.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#7F1D1D' }}>{e.email}: {e.erro}</div>)}
        </div>
      )}
    </div>
  )
}
