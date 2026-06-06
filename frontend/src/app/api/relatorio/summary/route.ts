import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createSupabaseServer } from '@/lib/supabase-server'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServer()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: perfil } = await supabase
      .from('user_profiles').select('plan').eq('user_id', user.id).single()
    if (perfil?.plan !== 'premium') {
      return NextResponse.json({ error: 'Disponível apenas no Premium' }, { status: 403 })
    }

    const { mes, ano, receitas, gastos, sobra, categorias, metas, nome } = await req.json()

    const catStr  = categorias?.length
      ? categorias.map((c: any) => `${c.nome} R$${Number(c.valor).toFixed(0)}`).join(', ')
      : 'nenhuma'
    const metaStr = metas?.length
      ? metas.map((m: any) => `"${m.nome}" ${m.pct}% concluída`).join(', ')
      : 'nenhuma'

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          'Você é o Assessor Financeiro pessoal da iMoney.',
          `Escreva uma análise mensal acolhedora e direta para ${nome || 'o usuário'} sobre ${mes}/${ano}.`,
          '',
          'DADOS DO MÊS:',
          `- Receitas: R$ ${Number(receitas).toFixed(2)}`,
          `- Gastos: R$ ${Number(gastos).toFixed(2)}`,
          `- Sobra: R$ ${Number(sobra).toFixed(2)} (${sobra >= 0 ? 'positiva' : 'negativa'})`,
          `- Principais categorias: ${catStr}`,
          `- Metas ativas: ${metaStr}`,
          '',
          'REGRAS:',
          '- Tom: parceiro próximo, humano, nunca julgador',
          '- Parágrafo 1 (2-3 frases): avaliação geral com dados concretos',
          '- Parágrafo 2 (2-3 frases): destaque positivo + ponto de atenção',
          '- Retorne APENAS JSON válido, sem markdown, neste formato exato:',
          '{"narrativa":"paragrafo1\n\nparagrafo2","proximos_passos":["passo 1","passo 2","passo 3"]}',
        ].join('\n'),
      }],
    })

    const raw  = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return NextResponse.json(result)

  } catch (err) {
    console.error('[relatorio/summary]', err)
    return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 })
  }
}
