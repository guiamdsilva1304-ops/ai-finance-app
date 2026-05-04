'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Post {
  id: string
  title: string
  slug: string
  published: boolean
  published_at: string
  reading_time_min: number
  created_at: string
  generated_by: string
}

function slugify(text: string) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState<'lista' | 'novo' | 'editar'>('lista')
  const [salvando, setSalvando] = useState(false)

  // Form
  const [titulo, setTitulo] = useState('')
  const [slug, setSlug] = useState('')
  const [metaDesc, setMetaDesc] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [publicar, setPublicar] = useState(true)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, published, published_at, reading_time_min, created_at, generated_by')
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function novoPost() {
    setTitulo(''); setSlug(''); setMetaDesc(''); setConteudo(''); setPublicar(true); setEditandoId(null)
    setModo('novo')
  }

  function editarPost(post: Post) {
    setTitulo(post.title); setSlug(post.slug); setMetaDesc(''); setConteudo(''); setPublicar(post.published); setEditandoId(post.id)
    setModo('editar')
  }

  async function salvar() {
    if (!titulo || !conteudo) return alert('Título e conteúdo são obrigatórios')
    setSalvando(true)
    try {
      const palavras = conteudo.split(/\s+/).length
      const reading_time_min = Math.max(1, Math.ceil(palavras / 200))
      const excerpt = conteudo.replace(/#+\s/g, '').replace(/\*\*/g, '').slice(0, 200).trim() + '...'
      const slugFinal = slug || slugify(titulo)

      const payload = {
        title: titulo,
        slug: slugFinal,
        excerpt,
        content: conteudo,
        seo_title: titulo,
        seo_description: metaDesc || excerpt.slice(0, 150),
        author: 'Gui da iMoney',
        category: 'educacao-financeira',
        tags: [],
        reading_time_min,
        published: publicar,
        published_at: publicar ? new Date().toISOString() : null,
        generated_by: 'manual',
        updated_at: new Date().toISOString(),
      }

      if (editandoId) {
        await supabase.from('blog_posts').update(payload).eq('id', editandoId)
      } else {
        await supabase.from('blog_posts').insert({ ...payload, created_at: new Date().toISOString() })
      }

      await carregar()
      setModo('lista')
    } catch (e) {
      alert('Erro ao salvar: ' + e)
    } finally {
      setSalvando(false)
    }
  }

  async function togglePublicar(post: Post) {
    await supabase.from('blog_posts').update({
      published: !post.published,
      published_at: !post.published ? new Date().toISOString() : null,
    }).eq('id', post.id)
    await carregar()
  }

  async function deletar(id: string) {
    if (!confirm('Tem certeza que quer deletar este artigo?')) return
    await supabase.from('blog_posts').delete().eq('id', id)
    await carregar()
  }

  const s = { fontFamily: "'Nunito',sans-serif" }

  if (modo === 'novo' || modo === 'editar') return (
    <div style={{ ...s, padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={() => setModo('lista')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e8ede8', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Voltar</button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>{editandoId ? 'Editar artigo' : 'Novo artigo'}</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>TÍTULO *</label>
          <input value={titulo} onChange={e => { setTitulo(e.target.value); if (!editandoId) setSlug(slugify(e.target.value)) }}
            placeholder="Ex: Como montar sua reserva de emergência em 2026"
            style={{ width: '100%', border: '2px solid #e8ede8', borderRadius: 10, padding: '12px 14px', fontSize: 15, fontFamily: "'Nunito',sans-serif", boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>SLUG (URL)</label>
          <input value={slug} onChange={e => setSlug(e.target.value)}
            placeholder="como-montar-reserva-emergencia-2026"
            style={{ width: '100%', border: '2px solid #e8ede8', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'monospace', boxSizing: 'border-box' }} />
          {slug && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>imoney.ia.br/blog/{slug}</div>}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>META DESCRIÇÃO (SEO)</label>
          <input value={metaDesc} onChange={e => setMetaDesc(e.target.value)}
            placeholder="Descrição curta para o Google (até 160 caracteres)"
            maxLength={160}
            style={{ width: '100%', border: '2px solid #e8ede8', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: "'Nunito',sans-serif", boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6 }}>CONTEÚDO * (Markdown)</label>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>Use # para título, ## para subtítulo, **negrito**, *itálico*</div>
          <textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
            placeholder="# Título do artigo&#10;&#10;Introdução do artigo...&#10;&#10;## Subtítulo&#10;&#10;Conteúdo..."
            rows={20}
            style={{ width: '100%', border: '2px solid #e8ede8', borderRadius: 10, padding: '14px', fontSize: 14, fontFamily: 'monospace', lineHeight: 1.7, boxSizing: 'border-box', resize: 'vertical' }} />
          {conteudo && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{conteudo.split(/\s+/).length} palavras · ~{Math.max(1, Math.ceil(conteudo.split(/\s+/).length / 200))} min de leitura</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#f8f9f8', borderRadius: 10 }}>
          <input type="checkbox" id="publicar" checked={publicar} onChange={e => setPublicar(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
          <label htmlFor="publicar" style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', cursor: 'pointer' }}>
            {publicar ? '✅ Publicar agora' : '📝 Salvar como rascunho'}
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={salvar} disabled={salvando || !titulo || !conteudo}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: salvando || !titulo || !conteudo ? '#e8ede8' : '#1D9E75', color: salvando || !titulo || !conteudo ? '#aaa' : '#fff', fontSize: 15, fontWeight: 700, cursor: salvando || !titulo || !conteudo ? 'not-allowed' : 'pointer', fontFamily: "'Nunito',sans-serif" }}>
            {salvando ? 'Salvando...' : editandoId ? '✓ Salvar alterações' : publicar ? '🚀 Publicar artigo' : '💾 Salvar rascunho'}
          </button>
          <button onClick={() => setModo('lista')} style={{ padding: '14px 20px', borderRadius: 12, border: '1px solid #e8ede8', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ ...s, padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>Blog da iMoney</h1>
          <div style={{ fontSize: 13, color: '#888' }}>{posts.length} artigos · {posts.filter(p => p.published).length} publicados</div>
        </div>
        <button onClick={novoPost} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
          + Novo artigo
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Carregando...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Nenhum artigo ainda</div>
          <button onClick={novoPost} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
            Escrever primeiro artigo
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: '#fff', border: '1px solid #e8ede8', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }}>{post.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: post.published ? '#E1F5EE' : '#f0f0f0', color: post.published ? '#085041' : '#888' }}>
                    {post.published ? '● Publicado' : '○ Rascunho'}
                  </span>
                  <span style={{ fontSize: 10, color: '#bbb', background: '#f8f9f8', padding: '2px 8px', borderRadius: 20 }}>
                    {post.generated_by === 'manual' ? '✍️ Manual' : '🤖 IA'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#aaa' }}>
                  /blog/{post.slug} · {post.reading_time_min} min · {new Date(post.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {post.published && (
                  <a href={`https://imoney.ia.br/blog/${post.slug}`} target="_blank" rel="noreferrer"
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e8ede8', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', color: '#444' }}>
                    Ver →
                  </a>
                )}
                <button onClick={() => togglePublicar(post)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e8ede8', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: post.published ? '#D85A30' : '#1D9E75' }}>
                  {post.published ? 'Despublicar' : 'Publicar'}
                </button>
                <button onClick={() => deletar(post.id)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ffeef0', background: '#ffeef0', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#D85A30' }}>
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
