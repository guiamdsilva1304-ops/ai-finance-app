import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

export async function POST(req: NextRequest) {
  try {
    const { titulo, slug, meta_description, conteudo, publicar_automaticamente } = await req.json()
    if (!titulo || !slug || !conteudo)
      return NextResponse.json({ error: 'titulo, slug e conteudo são obrigatórios' }, { status: 400 })

    const published = publicar_automaticamente === true

    // Calcula tempo de leitura (200 palavras por minuto)
    const palavras = conteudo.split(/\s+/).length
    const reading_time_min = Math.max(1, Math.ceil(palavras / 200))

    // Gera excerpt do início do conteúdo
    const excerpt = conteudo.replace(/#+\s/g, '').replace(/\*\*/g, '').slice(0, 200).trim() + '...'

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: titulo,
        slug,
        excerpt,
        content: conteudo,
        seo_title: titulo,
        seo_description: meta_description ?? '',
        author: 'Gui da iMoney',
        category: 'educacao-financeira',
        tags: [],
        reading_time_min,
        published,
        published_at: published ? new Date().toISOString() : null,
        generated_by: 'agente-seo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
      published,
      id: data.id,
      url: published ? `https://imoney.ia.br/blog/${slug}` : null,
      mensagem: published
        ? `Artigo publicado: imoney.ia.br/blog/${slug}`
        : `Artigo salvo como rascunho — aguardando aprovação`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/admin/blog/publicar]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, published, published_at, reading_time_min, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ artigos: data })
  } catch (error) {
    console.error('[/api/admin/blog/publicar GET]', error)
    return NextResponse.json({ error: 'Erro ao buscar artigos' }, { status: 500 })
  }
}
