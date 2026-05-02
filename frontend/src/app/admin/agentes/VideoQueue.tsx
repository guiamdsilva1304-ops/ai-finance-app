'use client'

import { useState, useEffect, useCallback } from 'react'

interface Video {
  id: string
  roteiro: string
  formato: string
  status: 'gerando' | 'pronto' | 'erro'
  video_url?: string
  task_id?: string
  aprovado: boolean
  postado: boolean
  legenda?: string
  duracao_segundos: number
  criado_em: string
}

export default function VideoQueue() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [roteiro, setRoteiro] = useState('')
  const [legenda, setLegenda] = useState('')

  const carregarFila = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/video')
      const data = await res.json()
      setVideos(data.videos ?? [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  const verificarStatus = useCallback(async (video: Video) => {
    if (video.status !== 'gerando' || !video.task_id) return
    try {
      const res = await fetch(`/api/admin/video?task_id=${video.task_id}&id=${video.id}`)
      const data = await res.json()
      if (data.status === 'completed' || data.status === 'failed') {
        carregarFila()
      }
    } catch { /* silencioso */ }
  }, [carregarFila])

  useEffect(() => {
    carregarFila()
  }, [carregarFila])

  // Polling automático a cada 15s para vídeos em geração
  useEffect(() => {
    const interval = setInterval(() => {
      const emGeracao = videos.filter(v => v.status === 'gerando')
      emGeracao.forEach(v => verificarStatus(v))
    }, 15000)
    return () => clearInterval(interval)
  }, [videos, verificarStatus])

  async function gerarVideo() {
    if (!roteiro.trim() || gerando) return
    setGerando(true)
    try {
      const res = await fetch('/api/admin/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roteiro, legenda, formato: 'Reels', duracao: 30 }),
      })
      const data = await res.json()
      if (data.sucesso) {
        setRoteiro('')
        setLegenda('')
        await carregarFila()
      }
    } catch { /* silencioso */ }
    finally { setGerando(false) }
  }

  async function aprovar(id: string, aprovado: boolean) {
    await fetch('/api/admin/video', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, aprovado }),
    })
    setVideos(prev => prev.map(v => v.id === id ? { ...v, aprovado } : v))
  }

  const statusCor: Record<string, string> = {
    gerando: '#EF9F27',
    pronto: '#1D9E75',
    erro: '#D85A30',
  }

  const statusLabel: Record<string, string> = {
    gerando: 'Gerando...',
    pronto: 'Pronto',
    erro: 'Erro',
  }

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", padding: '0' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>Fila de vídeos</div>
        <div style={{ fontSize: 12, color: '#888' }}>Gere, aprove e acompanhe os Reels da iMoney</div>
      </div>

      {/* Gerador */}
      <div style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', letterSpacing: '0.05em', marginBottom: 10 }}>NOVO VÍDEO</div>
        <textarea
          value={roteiro}
          onChange={e => setRoteiro(e.target.value)}
          placeholder="Cole o roteiro do vídeo aqui — o agente vai converter em prompt para o Seedance..."
          rows={4}
          style={{ width: '100%', resize: 'none', border: '1px solid #e8ede8', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: "'Nunito',sans-serif", outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', lineHeight: 1.6 }}
        />
        <textarea
          value={legenda}
          onChange={e => setLegenda(e.target.value)}
          placeholder="Legenda para o post (com hashtags)..."
          rows={2}
          style={{ width: '100%', resize: 'none', border: '1px solid #e8ede8', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: "'Nunito',sans-serif", outline: 'none', boxSizing: 'border-box', marginTop: 8, color: '#1a1a1a', lineHeight: 1.6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#aaa' }}>
            Seedance 2.0 · ~US$ 0,66/vídeo · 30 segundos · 9:16
          </div>
          <button
            onClick={gerarVideo}
            disabled={!roteiro.trim() || gerando}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: roteiro.trim() && !gerando ? '#1D9E75' : '#e8ede8',
              color: roteiro.trim() && !gerando ? '#fff' : '#aaa',
              cursor: roteiro.trim() && !gerando ? 'pointer' : 'not-allowed',
            }}>
            {gerando ? 'Enviando...' : 'Gerar vídeo'}
          </button>
        </div>
      </div>

      {/* Fila */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#aaa' }}>Carregando fila...</div>
      ) : videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#aaa' }}>Nenhum vídeo na fila ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {videos.map(video => (
            <div key={video.id} style={{ background: '#fff', border: `1px solid ${statusCor[video.status]}33`, borderRadius: 12, overflow: 'hidden' }}>
              {/* Status bar */}
              <div style={{ background: statusCor[video.status] + '12', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusCor[video.status], background: statusCor[video.status] + '22', padding: '2px 8px', borderRadius: 20 }}>
                    {statusLabel[video.status]}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a' }}>{video.formato} · {video.duracao_segundos}s</span>
                  {video.aprovado && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1D9E75', background: '#E1F5EE', padding: '2px 8px', borderRadius: 20 }}>✓ Aprovado</span>
                  )}
                </div>
                <span style={{ fontSize: 10, color: '#aaa' }}>
                  {new Date(video.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Conteúdo */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.05em', marginBottom: 4 }}>ROTEIRO</div>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                  {video.roteiro.slice(0, 200)}{video.roteiro.length > 200 ? '...' : ''}
                </div>

                {video.legenda && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.05em', marginBottom: 4 }}>LEGENDA</div>
                    <div style={{ fontSize: 11, color: '#666', background: '#f8f9f8', borderRadius: 8, padding: '7px 10px', lineHeight: 1.6, marginBottom: 10 }}>
                      {video.legenda.slice(0, 150)}{video.legenda.length > 150 ? '...' : ''}
                    </div>
                  </>
                )}

                {/* Player de vídeo */}
                {video.status === 'pronto' && video.video_url && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.05em', marginBottom: 6 }}>PRÉVIA</div>
                    <video
                      src={video.video_url}
                      controls
                      style={{ width: '100%', maxHeight: 300, borderRadius: 8, background: '#000' }}
                    />
                  </div>
                )}

                {/* Ações */}
                {video.status === 'pronto' && !video.postado && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => aprovar(video.id, !video.aprovado)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: video.aprovado ? '#ffeef0' : '#E1F5EE',
                        color: video.aprovado ? '#D85A30' : '#1D9E75',
                      }}>
                      {video.aprovado ? 'Remover aprovação' : '✓ Aprovar para postar'}
                    </button>
                    {video.video_url && (
                      
                        href={video.video_url}
                        download
                        style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e8ede8', fontSize: 12, fontWeight: 600, color: '#444', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        Baixar
                      </a>
                    )}
                  </div>
                )}

                {video.status === 'gerando' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF9F27', animation: `bounce 1.2s ${j * .2}s ease-in-out infinite` }} />
                    ))}
                    <span style={{ fontSize: 11, color: '#aaa' }}>Verificando automaticamente a cada 15s...</span>
                  </div>
                )}

                {video.status === 'erro' && (
                  <div style={{ fontSize: 12, color: '#D85A30' }}>Erro na geração. Tente novamente com um roteiro diferente.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
      `}</style>
    </div>
  )
}
