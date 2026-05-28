'use client'

import { useState, useEffect } from 'react'

interface UserOp {
  user_id: string
  email: string
  nome: string
  plan: string
  usadasHoje: number
  pct: number
  totalMsgs: number
  score: number | null
  diasCadastro: number
}

interface Resumo {
  mrr: number
  pagantes: number
  potencial_upgrade: number
  progresso_break_even: number
}

interface Dados {
  perto_do_limite: UserOp[]
  alta_frequencia: UserOp[]
  pagantes: UserOp[]
  resumo: Resumo
}

interface Resultado {
  email: string
  subject: string
  preview: string
}

function PctBar({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div style={{ height: 4, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 999 }} />
    </div>
  )
}

export default function AgenteReceita() {
  const [loading, setLoading] = useState(false)
  const [executando, setExecutando] = useState<string | null>(null)
  const [dados, setDados] = useState<Dados | null>(null)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [erros, setErros] = useState<Array<{ email: string; erro: string }>>([])
  const [erro, setErro] = useState('')

  const adminKey = typeof window !== 'undefined'
    ? localStorage.getItem('imoney_admin_key') || ''
    : ''

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/agentes/receita', {
        headers: { 'x-admin-key': adminKey },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDados(data)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  async function executar(acao: string) {
    setExecutando(acao)
    setResultados([])
    setErros([])
    setErro('')
    try {
      const res = await fetch('/api/admin/agentes/receita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ acao }),
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

  const r = dados?.resumo

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#92400E,#F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💰</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0d2414' }}>Agente de Receita</div>
            <div style={{ fontSize: 12, color: '#6b9e80', fontWeight: 600 }}>Converte engajamento em pagantes</div>
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

      {/* KPIs de receita */}
      {r && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'linear-gradient(135deg,#0a3d28,#1D9E75)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>MRR Atual</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>R$ {r.mrr.toFixed(0)}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{r.pagantes} pagante{r.pagantes !== 1 ? 's' : ''} · meta: 22</div>
          </div>
          <div style={{ background: '#fff', border: '1.5px solid #FED7AA', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Potencial Upgrade</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B' }}>R$ {r.potencial_upgrade.toFixed(0)}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{(dados?.perto_do_limite.length ?? 0) + (dados?.alta_frequencia.length ?? 0)} candidatos identificados</div>
          </div>
          <div style={{ background: '#fff', border: '1.5px solid #e4f5e9', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Break-even</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: r.progresso_break_even >= 100 ? '#22c55e' : '#1D9E75' }}>{r.progresso_break_even}%</div>
            <PctBar pct={r.progresso_break_even} cor="#1D9E75" />
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{r.pagantes}/22 pagantes</div>
          </div>
        </div>
      )}

      {/* Perto do limite */}
      {dados && dados.perto_do_limite.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #FED7AA', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 18px', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>Perto do limite ({dados.perto_do_limite.length})</span>
              <span style={{ fontSize: 11, color: '#B45309' }}>usaram 70%+ das mensagens hoje</span>
            </div>
            <button onClick={() => executar('upgrade_limite')} disabled={!!executando}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#F59E0B', color: '#fff', fontSize: 12, fontWeight: 700, cursor: executando ? 'wait' : 'pointer', fontFamily: 'Nunito, sans-serif' }}>
              {executando === 'upgrade_limite' ? 'Enviando...' : '📧 Enviar upgrade'}
            </button>
          </div>
          {dados.perto_do_limite.map(u => (
            <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: '1px solid #FEF3C7' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414' }}>{u.nome} <span style={{ fontWeight: 400, color: '#9ca3af' }}>· {u.email}</span></div>
                <div style={{ width: '100%', marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>Uso hoje</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: u.pct >= 90 ? '#EF4444' : '#F59E0B' }}>{u.usadasHoje}/15 ({u.pct}%)</span>
                  </div>
                  <PctBar pct={u.pct} cor={u.pct >= 90 ? '#EF4444' : '#F59E0B'} />
                </div>
              </div>
              {u.score && <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#f0fdf4', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>score {u.score}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Alta frequência */}
      {dados && dados.alta_frequencia.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #C4B5FD', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 18px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#5B21B6' }}>Alta frequência ({dados.alta_frequencia.length})</span>
              <span style={{ fontSize: 11, color: '#7C3AED' }}>8+ mensagens no total</span>
            </div>
            <button onClick={() => executar('upgrade_frequencia')} disabled={!!executando}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 700, cursor: executando ? 'wait' : 'pointer', fontFamily: 'Nunito, sans-serif' }}>
              {executando === 'upgrade_frequencia' ? 'Enviando...' : '📧 Enviar upgrade'}
            </button>
          </div>
          {dados.alta_frequencia.map(u => (
            <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: '1px solid #EDE9FE' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414' }}>{u.nome} <span style={{ fontWeight: 400, color: '#9ca3af' }}>· {u.email}</span></div>
                <div style={{ fontSize: 11, color: '#6b9e80', marginTop: 1 }}>{u.totalMsgs} msgs totais · D+{u.diasCadastro}</div>
              </div>
              {u.score && <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#f0fdf4', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>score {u.score}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Pagantes */}
      {dados && dados.pagantes.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #BBF7D0', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 18px', background: '#F0FDF4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>💚</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#14532D' }}>Pagantes ativos ({dados.pagantes.length})</span>
            </div>
          </div>
          {dados.pagantes.map(u => (
            <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: '1px solid #DCFCE7' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414' }}>{u.nome} <span style={{ fontWeight: 400, color: '#9ca3af' }}>· {u.email}</span></div>
                <div style={{ fontSize: 11, color: '#6b9e80', marginTop: 1 }}>{u.totalMsgs} msgs · plano {u.plan}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#DCFCE7', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>R$ 29,90/mês</span>
            </div>
          ))}
        </div>
      )}

      {/* Botão rodar tudo */}
      <button onClick={() => executar('rodar_tudo')} disabled={!!executando}
        style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: executando === 'rodar_tudo' ? '#1D9E75' : 'linear-gradient(135deg,#0a3d28,#1D9E75)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: executando ? 'wait' : 'pointer', fontFamily: 'Nunito, sans-serif', boxShadow: '0 4px 20px rgba(29,158,117,0.3)' }}>
        {executando === 'rodar_tudo' ? '⚡ Enviando emails...' : '⚡ Rodar tudo agora'}
      </button>

      {/* Resultados */}
      {resultados.length > 0 && (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '16px 18px', marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#14532D', marginBottom: 10 }}>✅ {resultados.length} email{resultados.length !== 1 ? 's' : ''} enviado{resultados.length !== 1 ? 's' : ''}</div>
          {resultados.map((r, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{r.email}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414' }}>{r.subject}</div>
              <div style={{ fontSize: 12, color: '#6b9e80', marginTop: 2 }}>{r.preview}…</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
