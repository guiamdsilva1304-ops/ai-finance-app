'use client'

import { useState, useEffect, useCallback } from 'react'

interface MetricasData {
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
  atualizado_em: string
}

function MetricCard({ titulo, valor, sub, cor, destaque }: {
  titulo: string
  valor: string | number
  sub?: string
  cor: string
  destaque?: boolean
}) {
  return (
    <div style={{
      background: destaque ? `linear-gradient(135deg, ${cor}dd, ${cor})` : '#fff',
      border: destaque ? 'none' : `1px solid ${cor}22`,
      borderRadius: 14, padding: '16px 18px',
      boxShadow: destaque ? `0 4px 20px ${cor}33` : '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: destaque ? 'rgba(255,255,255,0.75)' : '#aaa', letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>
        {titulo}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: destaque ? '#fff' : cor, lineHeight: 1, marginBottom: sub ? 4 : 0 }}>
        {valor}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: destaque ? 'rgba(255,255,255,0.7)' : '#aaa', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function ProgressBar({ valor, maximo, cor, label }: { valor: number; maximo: number; cor: string; label: string }) {
  const pct = Math.min(100, Math.round((valor / maximo) * 100))
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: cor }}>{valor}/{maximo} ({pct}%)</span>
      </div>
      <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

export default function Metricas() {
  const [metricas, setMetricas] = useState<MetricasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/metricas')
      const data = await res.json()
      if (!data.error) {
        setMetricas(data)
        setUltimaAtualizacao(new Date())
      }
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    carregar()
    // Atualiza a cada 60 segundos
    const interval = setInterval(carregar, 60000)
    return () => clearInterval(interval)
  }, [carregar])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: "'Nunito',sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1D9E75', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: '#aaa' }}>Carregando métricas...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if (!metricas) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontFamily: "'Nunito',sans-serif" }}>
      Erro ao carregar métricas.
    </div>
  )

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Nunito',sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Métricas em tempo real</div>
          <div style={{ fontSize: 12, color: '#aaa' }}>
            {ultimaAtualizacao ? `Atualizado ${ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · atualiza a cada 60s` : 'Carregando...'}
          </div>
        </div>
        <button onClick={carregar} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e8ede8', background: '#fff', fontSize: 12, fontWeight: 600, color: '#666', cursor: 'pointer' }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <MetricCard titulo="MRR" valor={`R$ ${metricas.mrr.toFixed(2).replace('.', ',')}`} sub={`${metricas.pagantes} pagantes`} cor="#1D9E75" destaque />
        <MetricCard titulo="Usuários" valor={metricas.total_usuarios} sub={`+${metricas.novos_semana} esta semana`} cor="#378ADD" />
        <MetricCard titulo="Novos hoje" valor={metricas.novos_hoje} sub="cadastros" cor="#7F77DD" />
        <MetricCard titulo="Artigos" valor={metricas.artigos_publicados} sub={`+${metricas.artigos_semana} esta semana`} cor="#085041" />
        <MetricCard titulo="Emails" valor={metricas.emails_enviados} sub="enviados" cor="#EF9F27" />
        <MetricCard titulo="Aprovações" valor={metricas.aprovacoes_pendentes} sub="pendentes" cor={metricas.aprovacoes_pendentes > 0 ? '#D85A30' : '#aaa'} />
      </div>

      {/* Break-even progress */}
      <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Progresso para break-even</div>
        <ProgressBar valor={metricas.pagantes} maximo={metricas.break_even} cor="#1D9E75" label="Pagantes (meta: 22)" />
        <ProgressBar valor={metricas.artigos_publicados} maximo={10} cor="#378ADD" label="Artigos no blog (meta: 10)" />
        <ProgressBar valor={metricas.missoes_concluidas} maximo={20} cor="#7F77DD" label="Missões executadas (meta: 20)" />
      </div>

      {/* Status dos agentes */}
      <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Status do sistema</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { label: 'Assessor IA', status: 'online', cor: '#1D9E75', detalhe: 'Respondendo consultas' },
            { label: 'Agente SEO', status: metricas.artigos_semana > 0 ? 'ativo' : 'aguardando', cor: metricas.artigos_semana > 0 ? '#1D9E75' : '#aaa', detalhe: `${metricas.artigos_semana} artigos esta semana` },
            { label: 'Agente de Growth', status: metricas.emails_enviados > 0 ? 'ativo' : 'aguardando', cor: metricas.emails_enviados > 0 ? '#7F77DD' : '#aaa', detalhe: `${metricas.emails_enviados} emails enviados` },
            { label: 'Supabase', status: 'online', cor: '#1D9E75', detalhe: `${metricas.total_usuarios} usuários` },
            { label: 'Vercel', status: 'online', cor: '#1D9E75', detalhe: 'Deploy automático ativo' },
            { label: 'Mercado Pago', status: 'aguardando', cor: '#EF9F27', detalhe: 'Token pendente de ativação' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8f9f8', borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.cor, flexShrink: 0, boxShadow: s.status === 'online' ? `0 0 6px ${s.cor}` : 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.detalhe}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
