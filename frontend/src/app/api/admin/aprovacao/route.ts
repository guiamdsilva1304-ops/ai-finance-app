import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adminGuard } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

export async function GET(req: NextRequest) {
  const denied = adminGuard(req)
  if (denied) return denied
  const status = req.nextUrl.searchParams.get('status') ?? 'pendente'
  const { data, error } = await supabase
    .from('approval_queue')
    .select('*')
    .eq('status', status)
    .order('criado_em', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(req: NextRequest) {
  const denied = adminGuard(req)
  if (denied) return denied
  try {
    const { agent_id, tipo, titulo, conteudo, metadata } = await req.json()
    if (!agent_id || !tipo || !titulo || !conteudo)
      return NextResponse.json({ error: 'campos obrigatorios' }, { status: 400 })

    const { data, error } = await supabase
      .from('approval_queue')
      .insert({ agent_id, tipo, titulo, conteudo, metadata: metadata ?? {}, status: 'pendente' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ sucesso: true, id: data.id })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const denied = adminGuard(req)
  if (denied) return denied
  try {
    const { id, acao, motivo } = await req.json()
    if (!id || !acao) return NextResponse.json({ error: 'id e acao obrigatorios' }, { status: 400 })

    const aprovado = acao === 'aprovar'

    const { data, error } = await supabase
      .from('approval_queue')
      .update({
        status: aprovado ? 'aprovado' : 'rejeitado',
        aprovado_em: aprovado ? new Date().toISOString() : null,
        rejeitado_em: !aprovado ? new Date().toISOString() : null,
        motivo_rejeicao: motivo ?? null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Se aprovado, executa a ação correspondente
    if (aprovado && data) {
      await executarAcaoAprovada(data)
    }

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function executarAcaoAprovada(item: {
  tipo: string
  titulo: string
  conteudo: string
  metadata: Record<string, string>
}) {
  try {
    if (item.tipo === 'artigo') {
      const slug = item.titulo.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 80)

      const palavras = item.conteudo.split(/\s+/).length
      const reading_time_min = Math.max(1, Math.ceil(palavras / 200))
      const excerpt = item.conteudo.replace(/#+\s/g, '').replace(/\*\*/g, '').slice(0, 200) + '...'

      await supabase.from('blog_posts').insert({
        title: item.titulo,
        slug,
        excerpt,
        content: item.conteudo,
        seo_title: item.titulo,
        seo_description: item.metadata?.meta_description ?? excerpt,
        author: 'Gui da iMoney',
        category: item.metadata?.category ?? 'educacao-financeira',
        tags: [],
        reading_time_min,
        published: true,
        published_at: new Date().toISOString(),
        generated_by: 'agente-seo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // Campanhas de email aprovadas são broadcast — não têm user_id individual
    // O agente GRW é responsável por enfileirar emails com user_id via lib/agents/growth.ts
    if (item.tipo === 'email' || item.tipo === 'campanha') {
      console.log('[aprovacao] Campanha aprovada para execução pelo agente GRW:', item.titulo)
    }
  } catch (e) {
    console.error('[aprovacao] Erro ao executar ação:', e)
  }
}
