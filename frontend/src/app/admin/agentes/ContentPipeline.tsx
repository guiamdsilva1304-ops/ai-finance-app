'use client'
import { useState, useEffect, useCallback } from 'react'

type StatusFilter = 'aguardando_aprovacao' | 'aprovado' | 'rejeitado'

const STATUS_LABELS: Record<StatusFilter, string> = {
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

interface PipelineItem {
  id: string
  platform: string
  content_type: string
  status: string
  tema: string
  angulo?: string
  caption?: string
  hashtags?: string[]
  cta?: string
  melhor_horario?: string
  visual_description?: string
  slides?: unknown
  created_at: string
  scheduled_for?: string
}

export default function ContentPipeline() {
  const [filter, setFilter] = useState<StatusFilter>('aguardando_aprovacao')
  const [items, setItems] = useState<PipelineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/pipeline?status=${filter}`, { credentials: 'include' })
      const json = await res.json()
      setItems(json.data ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function updateStatus(id: string, status: 'aprovado' | 'rejeitado') {
    await fetch('/api/admin/pipeline', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    fetchItems()
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              background: filter === f ? '#00C853' : '#f0f5f1',
              color: filter === f ? '#0a1f0a' : '#16241a',
            }}
          >
            {STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading && <p style={{ color: '#888' }}>Carregando...</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: '#888' }}>Nenhum post com status &quot;{STATUS_LABELS[filter]}&quot; no momento.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: 'white',
            border: '1px solid #eee',
            borderRadius: 12,
            padding: '16px 20px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.tema}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {item.platform} · {item.content_type} · {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  {item.scheduled_for && <> · 📅 {item.scheduled_for}</>}
                </div>
                {item.angulo && <div style={{ fontSize: 13, color: '#555', marginTop: 4, fontStyle: 'italic' }}>"{item.angulo}"</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {filter === 'aguardando_aprovacao' && (
                  <>
                    <button onClick={() => updateStatus(item.id, 'aprovado')} style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: '#00C853', color: 'white', fontWeight: 600, fontSize: 13,
                    }}>✓ Aprovar</button>
                    <button onClick={() => updateStatus(item.id, 'rejeitado')} style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: '#ff4444', color: 'white', fontWeight: 600, fontSize: 13,
                    }}>✕ Rejeitar</button>
                  </>
                )}
                <button onClick={() => setExpanded(expanded === item.id ? null : item.id)} style={{
                  padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer',
                  background: 'white', fontSize: 13,
                }}>
                  {expanded === item.id ? 'Fechar ▲' : 'Ver tudo ▼'}
                </button>
              </div>
            </div>

            {/* Expandido */}
            {expanded === item.id && (
              <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Caption */}
                {item.caption && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#333' }}>📝 Caption</div>
                    <div style={{ fontSize: 13, color: '#555', background: '#f8f8f8', padding: '10px 12px', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                      {item.caption}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {item.hashtags && item.hashtags.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#333' }}>🏷️ Hashtags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {item.hashtags.map((h, i) => (
                        <span key={i} style={{ background: '#e8f5e9', color: '#00C853', padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                          #{h.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual / Prompt */}
                {item.visual_description && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#333' }}>🎨 Descrição visual / Prompt</div>
                    <div style={{ fontSize: 13, color: '#555', background: '#f0f4ff', padding: '10px 12px', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                      {item.visual_description}
                    </div>
                  </div>
                )}

                {/* CTA */}
                {item.cta && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#333' }}>📣 CTA</div>
                    <div style={{ fontSize: 13, color: '#555' }}>{item.cta}</div>
                  </div>
                )}

                {/* Horário */}
                {item.melhor_horario && (
                  <div style={{ fontSize: 13, color: '#888' }}>⏰ Melhor horário: <strong>{item.melhor_horario}</strong></div>
                )}

                {/* Slides (carousel) */}
                {item.slides && typeof item.slides === 'object' && Array.isArray(item.slides) && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#333' }}>🖼️ Slides do Carrossel</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(item.slides as Record<string, string>[]).map((slide, i) => (
                        <div key={i} style={{ background: '#f8f8f8', padding: '10px 12px', borderRadius: 8, fontSize: 13 }}>
                          <strong>Slide {slide.numero || i + 1} — {slide.tipo}</strong>
                          {slide.titulo && <div><b>Título:</b> {slide.titulo}</div>}
                          {slide.corpo && <div><b>Corpo:</b> {slide.corpo}</div>}
                          {slide.destaque && <div><b>Destaque:</b> {slide.destaque}</div>}
                          {slide.prompt_imagem && (
                            <div style={{ marginTop: 6, background: '#f0f4ff', padding: '8px', borderRadius: 6 }}>
                              <b>🎨 Prompt imagem:</b> {slide.prompt_imagem}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roteiro Reels (slides como objeto) */}
                {item.slides && typeof item.slides === 'object' && !Array.isArray(item.slides) && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#333' }}>🎬 Roteiro Reels</div>
                    <div style={{ background: '#f8f8f8', padding: '12px', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {Object.entries(item.slides as Record<string, string>).map(([key, val]) => (
                        <div key={key} style={{ marginBottom: 8 }}>
                          <strong style={{ color: '#00C853' }}>{key.replace(/_/g, ' ').toUpperCase()}:</strong>
                          <div style={{ marginTop: 2 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
