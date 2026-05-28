'use client'

import { useState, useEffect } from 'react'
import { marked } from 'marked'

interface Metricas {
  totalUsuarios: number
  novosSemana: number
  variacaoNovos: number | null
  ativos7d: number
  taxaAtivacao: number
  pagantes: number
  mrr: number
  taxaConversao: number
  progressoBreakEven: number
  breakEven: number
  chats7d: number
  msgsPorUsuario: number
  totalMetas: number
  metasConcluidas: number
  scoreMedio: number | null
  artigosBlog: number
  artigosSemana: number
  emailsEnviados: number
  geradoEm: string
}

function KPI({ label, valor, sub, cor, delta }: {
  label: string; valor: string | number; sub?: string; cor: string; delta?: number | null
}) {
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${cor}22`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: cor, lineHeight: 1 }}>{valor}</span>
        {delta !== null && delta !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 700, color: delta >= 0 ? '#22c55e' : '#ef4444' }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontWeight: 600 }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({ valor, maximo, cor, label }: { valor: number; maximo: number; cor: string; label: string }) {
  const pct = Math.min(100, Math.round((valor / maximo) * 100))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: cor }}>{valor}/{maximo} · {pct}%</span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${cor}99, ${cor})`, borderRadius: 999, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

export default function AgenteDados() {
  const [loading, setLoading] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [briefing, setBriefing] = useState('')
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const adminKey = typeof window !== 'undefined'
    ? localStorage.getItem('imoney_admin_key') || ''
    : ''

  async function gerar(enviar = false) {
    enviar ? setEnviando(true) : setLoading(true)
    setErro('')
    try {
      const url = enviar ? '/api/admin/agentes/dados?enviar=true' : '/api/admin/agentes/dados'
      const res = await fetch(url, { headers: { 'x-admin-key': adminKey } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMetricas(data.metricas)
      setBriefing(data.briefing)
      if (enviar) setEmailEnviado(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar')
    } finally {
      setLoading(false)
      setEnviando(false)
    }
  }

  useEffect(() => { gerar() }, [])

  const briefingHTML = briefing ? marked(briefing, { breaks: true, gfm: true }) as string : ''

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#0a3d28,#1D9E75)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📊</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0d2414' }}>Agente de Dados</div>
            <div style={{ fontSize: 12, color: '#6b9e80', fontWeight: 600 }}>Briefing executivo · toda segunda-feira</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => gerar(false)} disabled={loading || enviando}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e4f5e9', background: '#fff', fontSize: 13, fontWeight: 700, color: '#1D9E75', cursor: 'pointer' }}>
            {loading ? '...' : '↻ Atualizar'}
          </button>
          <button onClick={() => gerar(true)} disabled={loading || enviando}
            style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: emailEnviado ? '#22c55e' : '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {enviando ? 'Enviando...' : emailEnviado ? '✅ Enviado!' : '📧 Enviar para email'}
          </button>
        </div>
      </div>

      {erro && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#EF4444', marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {/* KPIs */}
      {metricas && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
            <KPI label="Total Usuários" valor={metricas.totalUsuarios} cor="#4493F8" />
            <KPI label="Novos esta semana" valor={metricas.novosSemana} cor="#22c55e" delta={metricas.variacaoNovos} sub="vs semana passada" />
            <KPI label="Ativos 7 dias" valor={metricas.ativos7d} cor="#1D9E75" sub={`${metricas.taxaAtivacao}% do total`} />
            <KPI label="Pagantes" valor={metricas.pagantes} cor="#F0B429" sub={`MRR R$ ${metricas.mrr.toFixed(0)}`} />
            <KPI label="Conversão" valor={`${metricas.taxaConversao}%`} cor="#8B5CF6" sub="free → pro" />
            <KPI label="Msgs/Assessor 7d" valor={metricas.chats7d} cor="#06b6d4" sub={`${metricas.msgsPorUsuario} por ativo`} />
          </div>

          {/* Barras de progresso */}
          <div style={{ background: '#fff', border: '1px solid #e4f5e9', borderRadius: 14, padding: '18px 20px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ProgressBar valor={metricas.pagantes} maximo={metricas.breakEven} cor="#F0B429" label="Break-even (22 pagantes)" />
            <ProgressBar valor={metricas.metasConcluidas} maximo={Math.max(metricas.totalMetas, 1)} cor="#1D9E75" label="Metas concluídas" />
            <ProgressBar valor={metricas.artigosBlog} maximo={50} cor="#4493F8" label="Blog (meta: 50 artigos)" />
          </div>

          {/* Score médio */}
          {metricas.scoreMedio && (
            <div style={{ background: `linear-gradient(135deg, #0a3d28, #1D9E75)`, borderRadius: 14, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Score médio de saúde financeira</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{metricas.scoreMedio}<span style={{ fontSize: 16, opacity: 0.6 }}>/100</span></div>
              </div>
              <div style={{ fontSize: 40 }}>🧭</div>
            </div>
          )}
        </>
      )}

      {/* Briefing */}
      {briefingHTML && (
        <div style={{ background: '#fff', border: '1px solid #e4f5e9', borderRadius: 14, padding: '24px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            🤖 Análise do Agente · {metricas ? new Date(metricas.geradoEm).toLocaleString('pt-BR') : ''}
          </div>
          <div
            className="prose"
            style={{ fontSize: 14, lineHeight: 1.7, color: '#1a1a1a' }}
            dangerouslySetInnerHTML={{ __html: briefingHTML }}
          />
        </div>
      )}

      {loading && !metricas && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>
          🔍 Coletando dados e gerando análise...
        </div>
      )}
    </div>
  )
}
