'use client'

import { useState, useEffect } from 'react'

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

interface Segmentos {
  emRisco: UserPerfil[]
  inativos: UserPerfil[]
  novos: UserPerfil[]
  engajados: UserPerfil[]
}

interface Resultado {
  email: string
  tipo: string
  subject: string
  preview: string
}

const SEG_CONFIG = {
  emRisco:   { label: 'Em Risco',  icon: '🚨', cor: '#EF4444', bg: '#FEF2F2', desc: 'Cadastraram há 2-6 dias, nunca usaram o Assessor' },
  inativos:  { label: 'Inativos',  icon: '😴', cor: '#F97316', bg: '#FFF7ED', desc: 'Usaram o app mas sumiram há 7+ dias' },
  novos:     { label: 'Novos',     icon: '🌱', cor: '#22C55E', bg: '#F0FDF4', desc: 'Cadastraram há menos de 2 dias' },
  engajados: { label: 'Engajados', icon: '🔥', cor: '#8B5CF6', bg: '#F5F3FF', desc: 'Ativos nos últimos 3 dias com 3+ msgs' },
}

export default function AgenteCS() {
  const [loading, setLoading] = useState(false)
  const [executando, setExecutando] = useState<string | null>(null)
  const [segmentos, setSegmentos] = useState<Segmentos | null>(null)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [erros, setErros] = useState<Array<{ email: string; erro: string }>>([])
  const [erro, setErro] = useState('')


  async function diagnosticar() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/agentes/cs', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSegmentos(data.detalhes)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  async function executarAcao(acao: string) {
    setExecutando(acao)
    setResultados([])
    setErros([])
    setErro('')
    try {
      const res = await fetch('/api/admin/agentes/cs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResultados(data.resultados || [])
      setErros(data.erros || [])
      await diagnosticar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao executar')
    } finally {
      setExecutando(null)
    }
  }

  useEffect(() => { diagnosticar() }, [])

  const ACOES = [
    { id: 'engajar_risco',      label: 'Engajar em risco',        icon: '🚨', cor: '#EF4444', seg: 'emRisco' },
    { id: 'reativar_inativos',  label: 'Reativar inativos',       icon: '😴', cor: '#F97316', seg: 'inativos' },
    { id: 'upgrade_engajados',  label: 'Upgrade dos engajados',   icon: '🔥', cor: '#8B5CF6', seg: 'engajados' },
    { id: 'rodar_tudo',         label: 'Rodar tudo agora',        icon: '⚡', cor: '#1D9E75', seg: null },
  ]

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#0a3d28,#1D9E75)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎧</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0d2414' }}>Agente CS</div>
            <div style={{ fontSize: 12, color: '#6b9e80', fontWeight: 600 }}>Customer Success Autônomo</div>
          </div>
        </div>
        <button
          onClick={diagnosticar}
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e4f5e9', background: '#fff', fontSize: 13, fontWeight: 700, color: '#1D9E75', cursor: 'pointer' }}
        >
          {loading ? '...' : '↻ Atualizar'}
        </button>
      </div>

      {erro && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#EF4444', marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {/* Segmentos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12, marginBottom: 24 }}>
        {(Object.entries(SEG_CONFIG) as Array<[keyof typeof SEG_CONFIG, typeof SEG_CONFIG[keyof typeof SEG_CONFIG]]>).map(([key, cfg]) => {
          const count = segmentos ? segmentos[key].length : '—'
          return (
            <div key={key} style={{ background: cfg.bg, border: `1.5px solid ${cfg.cor}33`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: cfg.cor }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: cfg.cor, lineHeight: 1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, lineHeight: 1.4 }}>{cfg.desc}</div>
            </div>
          )
        })}
      </div>

      {/* Lista de usuários */}
      {segmentos && (
        <div style={{ background: '#fff', border: '1px solid #e4f5e9', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f7f2', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0d2414' }}>👥 Usuários mapeados</span>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {(['emRisco', 'inativos', 'engajados', 'novos'] as const).flatMap(seg =>
              segmentos[seg].map(u => {
                const cfg = SEG_CONFIG[seg]
                return (
                  <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid #f9fafb' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.nome} <span style={{ fontWeight: 400, color: '#9ca3af' }}>· {u.email}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#6b9e80', marginTop: 1 }}>
                        {u.chatCount} msgs · {u.metaCount} metas · D+{u.diasCadastro} · {u.diasSemLogin < 999 ? `${u.diasSemLogin}d sem login` : 'nunca logou'}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: cfg.cor, background: cfg.bg, padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>
                      {cfg.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={{ background: '#fff', border: '1px solid #e4f5e9', borderRadius: 14, padding: '18px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0d2414', marginBottom: 14 }}>⚡ Ações do Agente</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 10 }}>
          {ACOES.map(a => {
            const count = segmentos && a.seg ? segmentos[a.seg as keyof Segmentos].length : null
            const isRunning = executando === a.id
            return (
              <button
                key={a.id}
                onClick={() => executarAcao(a.id)}
                disabled={!!executando}
                style={{
                  padding: '12px 16px', borderRadius: 12,
                  border: `1.5px solid ${a.cor}44`,
                  background: isRunning ? a.cor : `${a.cor}10`,
                  color: isRunning ? '#fff' : a.cor,
                  fontSize: 13, fontWeight: 700, cursor: executando ? 'wait' : 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span>{a.icon}</span>
                  <span>{isRunning ? 'Executando...' : a.label}</span>
                </div>
                {count !== null && (
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{count} usuário{count !== 1 ? 's' : ''}</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Resultados */}
      {resultados.length > 0 && (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#14532D', marginBottom: 12 }}>
            ✅ {resultados.length} email{resultados.length !== 1 ? 's' : ''} enviado{resultados.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resultados.map((r, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#E1F5EE', padding: '2px 8px', borderRadius: 6 }}>{r.tipo}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{r.email}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414' }}>{r.subject}</div>
                <div style={{ fontSize: 12, color: '#6b9e80', marginTop: 2 }}>{r.preview}…</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {erros.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 6 }}>⚠️ {erros.length} erro(s)</div>
          {erros.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: '#7F1D1D' }}>{e.email}: {e.erro}</div>
          ))}
        </div>
      )}
    </div>
  )
}
