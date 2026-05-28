'use client'

import { useState, useEffect } from 'react'

interface PipelineItem {
  platform: string
  content_type: string
  status: string
  tema: string
  created_at: string
}

interface Gerado {
  tipo: string
  pilar: string
  tema: unknown
  salvos: Array<{ id: string; plataforma: string }>
}

interface Resultado {
  ok: boolean
  gerados: number
  tendencias_usadas: string
  detalhes: Gerado[]
  erros?: Array<{ tipo: string; erro: string }>
}

const STATUS_CONF: Record<string, { label: string; cor: string; bg: string }> = {
  aguardando_aprovacao: { label: 'Aguardando', cor: '#F59E0B', bg: '#FFF7ED' },
  aprovado:             { label: 'Aprovado',   cor: '#22C55E', bg: '#F0FDF4' },
  rejeitado:            { label: 'Rejeitado',  cor: '#EF4444', bg: '#FEF2F2' },
  publicado:            { label: 'Publicado',  cor: '#4493F8', bg: '#EFF6FF' },
}

const TIPO_CONF: Record<string, { label: string; icon: string }> = {
  reels_script: { label: 'Reels/TikTok', icon: '🎬' },
  carousel:     { label: 'Carrossel',    icon: '🎠' },
  single_post:  { label: 'Post',         icon: '📸' },
}

const PLAT_CONF: Record<string, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📸' },
  tiktok:    { label: 'TikTok',   icon: '🎵' },
}

export default function AgenteConteudo() {
  const [loading, setLoading] = useState(false)
  const [executando, setExecutando] = useState<string | null>(null)
  const [resumo, setResumo] = useState<{ pendentes: number; aprovados: number } | null>(null)
  const [pipeline, setPipeline] = useState<PipelineItem[]>([])
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState('')

  const adminKey = typeof window !== 'undefined'
    ? localStorage.getItem('imoney_admin_key') || ''
    : ''

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/agentes/conteudo', {
        headers: { 'x-admin-key': adminKey },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResumo(data.resumo)
      setPipeline(data.pipeline)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  async function gerar(acao: string) {
    setExecutando(acao)
    setResultado(null)
    setErro('')
    try {
      const res = await fetch('/api/admin/agentes/conteudo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ acao }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResultado(data)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar')
    } finally {
      setExecutando(null)
    }
  }

  useEffect(() => { carregar() }, [])

  const ACOES = [
    { id: 'reels',           label: '2 Reels/TikTok',    icon: '🎬', desc: 'Roteiros prontos para gravar' },
    { id: 'carousel',        label: '1 Carrossel',        icon: '🎠', desc: '7 slides para Instagram' },
    { id: 'semana_completa', label: 'Semana completa',    icon: '📅', desc: '2 Reels + 1 Carrossel' },
  ]

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7C2D12,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✍️</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0d2414' }}>Agente de Conteúdo</div>
            <div style={{ fontSize: 12, color: '#6b9e80', fontWeight: 600 }}>Gera roteiros e carrosséis · toda segunda e quinta</div>
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

      {/* KPIs */}
      {resumo && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Aguardando aprovação</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#F59E0B' }}>{resumo.pendentes}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>peças para revisar</div>
          </div>
          <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Aprovados</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#22C55E' }}>{resumo.aprovados}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>prontos para postar</div>
          </div>
          <div style={{ background: '#fff', border: '1.5px solid #e4f5e9', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Frequência alvo</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1D9E75', lineHeight: 1.2 }}>3×<br /><span style={{ fontSize: 14 }}>por semana</span></div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>2 Reels + 1 carrossel</div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={{ background: '#fff', border: '1px solid #e4f5e9', borderRadius: 14, padding: '18px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0d2414', marginBottom: 4 }}>⚡ Gerar conteúdo agora</div>
        <div style={{ fontSize: 12, color: '#6b9e80', marginBottom: 14 }}>
          O agente pesquisa trends financeiros do momento e gera peças alinhadas aos pilares SEPC da iMoney.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 10 }}>
          {ACOES.map(a => {
            const isRunning = executando === a.id
            return (
              <button key={a.id} onClick={() => gerar(a.id)} disabled={!!executando}
                style={{
                  padding: '14px 16px', borderRadius: 12, border: '1.5px solid #e4f5e9',
                  background: isRunning ? '#1D9E75' : '#f8fdf9',
                  color: isRunning ? '#fff' : '#0d2414',
                  fontSize: 13, fontWeight: 700, cursor: executando ? 'wait' : 'pointer',
                  textAlign: 'left', fontFamily: 'Nunito, sans-serif', transition: 'all 0.15s',
                }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{isRunning ? '⏳' : a.icon}</div>
                <div style={{ fontWeight: 800 }}>{isRunning ? 'Gerando...' : a.label}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{a.desc}</div>
              </button>
            )
          })}
        </div>

        {executando && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>
            🔍 Pesquisando trends → gerando roteiros com IA → salvando no pipeline...
          </div>
        )}
      </div>

      {/* Resultado da geração */}
      {resultado && (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#14532D', marginBottom: 10 }}>
            ✅ {resultado.gerados} peça{resultado.gerados !== 1 ? 's' : ''} gerada{resultado.gerados !== 1 ? 's' : ''} e salvas no pipeline
          </div>
          {resultado.tendencias_usadas && (
            <div style={{ fontSize: 11, color: '#166534', background: '#DCFCE7', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
              🔍 Trends usadas: {resultado.tendencias_usadas}
            </div>
          )}
          {resultado.detalhes.map((d, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{d.tipo === 'reels' ? '🎬' : '🎠'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1D9E75', background: '#E1F5EE', padding: '2px 8px', borderRadius: 6 }}>{d.pilar}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0d2414' }}>{String(d.tema)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#6b9e80', marginTop: 4 }}>
                Salvo em: {d.salvos.map(s => s.plataforma).join(', ')} · Aguardando sua aprovação
              </div>
            </div>
          ))}
          {resultado.erros && resultado.erros.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#EF4444' }}>
              ⚠️ {resultado.erros.length} erro(s): {resultado.erros.map(e => e.erro).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Pipeline recente */}
      {pipeline.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e4f5e9', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f0f7f2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0d2414' }}>📋 Pipeline recente</span>
            <a href="/admin/agentes" style={{ fontSize: 12, color: '#1D9E75', fontWeight: 700, textDecoration: 'none' }}>
              Ver tudo na aba Pipeline →
            </a>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {pipeline.map((item, i) => {
              const status = STATUS_CONF[item.status] ?? { label: item.status, cor: '#888', bg: '#f5f5f5' }
              const tipo = TIPO_CONF[item.content_type] ?? { label: item.content_type, icon: '📄' }
              const plat = PLAT_CONF[item.platform] ?? { label: item.platform, icon: '🌐' }
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{tipo.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2414', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.tema}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b9e80', marginTop: 1 }}>
                      {plat.icon} {plat.label} · {tipo.label} · {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: status.cor, background: status.bg, padding: '3px 10px', borderRadius: 8, flexShrink: 0 }}>
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pipeline.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Pipeline vazio</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Clique em "Semana completa" para gerar o primeiro lote</div>
        </div>
      )}
    </div>
  )
}
