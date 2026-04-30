import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { titulo, slug, meta_description, conteudo, publicar_automaticamente } = await req.json()

    if (!titulo || !slug || !conteudo)
      return NextResponse.json({ error: 'titulo, slug e conteudo são obrigatórios' }, { status: 400 })

    const status = publicar_automaticamente ? 'publicado' : 'rascunho'

    const { data, error } = await supabase
      .from('admin_posts')
      .insert({
        titulo,
        slug,
        meta_description: meta_description ?? '',
        conteudo,
        status,
        criado_em: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
      status,
      id: data.id,
      mensagem: status === 'publicado'
        ? `Artigo publicado automaticamente: /${slug}`
        : `Artigo salvo como rascunho aguardando sua aprovação`,
    })

  } catch (error) {
    console.error('[/api/admin/blog/publicar]', error)
    return NextResponse.json({ error: 'Erro ao publicar artigo' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('admin_posts')
      .select('id, titulo, slug, status, criado_em')
      .order('criado_em', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ artigos: data })
  } catch (error) {
    console.error('[/api/admin/blog/publicar GET]', error)
    return NextResponse.json({ error: 'Erro ao buscar artigos' }, { status: 500 })
  }
}
