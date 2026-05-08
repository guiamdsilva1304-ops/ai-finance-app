'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Post = {
  id: string
  titulo: string
  tema: string
  plataforma: string
  status: string
  criado_em: string
  conteudo: string
  metadata: any
}

export default function ContentPipeline() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pendente' | 'aprovado' | 'rejeitado'>('pendente')

  useEffect(() => {
    fetchPosts()
  }, [filter])

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('content_pipeline')
      .select('*')
      .eq('status', filter)
      .order('criado_em', { ascending: false })
      .limit(20)
    setPosts(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: 'aprovado' | 'rejeitado') {
    await supabase.from('content_pipeline').update({ status }).eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  function parseConteudo(raw: string) {
    try { return JSON.parse(raw) } catch { return null }
  }

  const C = {
    bg: '#0a0a0a', card: '#111', border: '#1e1e1e',
    green: '#00C853', darkGreen: '#1a3a1a',
    text: '#e8e8e8', muted: '#555', s2: '#181818',
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: C.text }}>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['pendente', 'aprovado', 'rejeitado'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: filter === f ? C.green : C.s2,
            color: filter === f ? '#000' : C.muted,
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: C.muted, fontSize: 13 }}>Carregando...</p>}
      {!loading && posts.length === 0 && (
        <p style={{ color: C.muted, fontSize: 13 }}>Nenhum post {filter} no momento.</p>
      )}

      {posts.map(post => {
        const data = parseConteudo(post.conteudo)
        const isOpen = expanded === post.id

        return (
          <div key={post.id} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, marginBottom: 12, overflow: 'hidden',
          }}>
            {/* Header */}
            <div
              onClick={() => setExpanded(isOpen ? null : post.id)}
              style={{
                padding: '14px 18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  {post.titulo}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  {post.plataforma} · {new Date(post.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {filter === 'pendente' && (
                  <>
                    <button onClick={e => { e.stopPropagation(); updateStatus(post.id, 'aprovado') }} style={{
                      background: C.green, color: '#000', border: 'none',
                      borderRadius: 8, padding: '6px 14px', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer',
                    }}>✓ Aprovar</button>
                    <button onClick={e => { e.stopPropagation(); updateStatus(post.id, 'rejeitado') }} style={{
                      background: 'rgba(255,82,82,0.15)', color: '#ff5252', border: '1px solid rgba(255,82,82,0.3)',
                      borderRadius: 8, padding: '6px 14px', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer',
                    }}>✗ Rejeitar</button>
                  </>
                )}
                <span style={{ color: C.muted, fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Conteúdo expandido */}
            {isOpen && data && (
              <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${C.border}` }}>

                {/* Gancho */}
                {data.gancho && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, color: C.green, fontFamily: 'monospace', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>Gancho</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{data.gancho}</div>
                  </div>
                )}

                {/* Slides */}
                {data.slides?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, color: C.green, fontFamily: 'monospace', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>Slides ({data.slides.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {data.slides.map((s: any) => (
                        <div key={s.numero} style={{
                          background: C.s2, borderRadius: 8, padding: '10px 14px',
                          fontSize: 13,
                        }}>
                          <span style={{ color: C.green, fontWeight: 700, marginRight: 8 }}>#{s.numero}</span>
                          <strong>{s.titulo}</strong>
                          {s.corpo && <div style={{ color: C.muted, marginTop: 4, fontSize: 12 }}>{s.corpo}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legenda */}
                {data.legenda && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, color: C.green, fontFamily: 'monospace', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>Legenda</div>
                    <div style={{
                      background: C.s2, borderRadius: 8, padding: '10px 14px',
                      fontSize: 12, color: C.muted, whiteSpace: 'pre-wrap', lineHeight: 1.6,
                    }}>{data.legenda}</div>
                  </div>
                )}

                {/* Prompt de imagem */}
                {data.prompt_imagem && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, color: C.green, fontFamily: 'monospace', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>Prompt de Imagem (Gemini)</div>
                    <div style={{
                      background: C.darkGreen, borderRadius: 8, padding: '10px 14px',
                      fontSize: 12, color: '#a8d5a2', whiteSpace: 'pre-wrap', lineHeight: 1.6,
                    }}>{data.prompt_imagem}</div>
                    <button onClick={() => navigator.clipboard.writeText(data.prompt_imagem)} style={{
                      marginTop: 6, background: 'transparent', border: `1px solid ${C.border}`,
                      color: C.muted, borderRadius: 6, padding: '4px 10px', fontSize: 11,
                      cursor: 'pointer',
                    }}>📋 Copiar prompt</button>
                  </div>
                )}

                {/* Melhor horário */}
                {data.melhor_horario && (
                  <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
                    🕐 Melhor horário: <strong style={{ color: C.text }}>{data.melhor_horario}</strong>
                    {data.cta && <> · CTA: <strong style={{ color: C.text }}>{data.cta}</strong></>}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
