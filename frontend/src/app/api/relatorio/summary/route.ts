import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client  = new Anthropic()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const auth  = req.headers.get('authorization')
    const token = auth?.replace('Bearer ', '') ?? ''
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: perfil } = await supabase
      .from('user_profiles').select('plan').eq('id', user.id).single()
    if (perfil?.plan !== 'premium')
      return NextResponse.json({ error: 'Disponível apenas no Premium' }, { status: 403 })

    const body = await req.json()
    const { mes, ano, receitas, gastos, sobra, categorias, metas, nome } = body

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Você é o Assessor Financeiro pessoal da iMoney. Escreva uma análise mensal acolhedora e direta para ${nome || 'o usuário'} sobre o mês de ${mes}/${ano}.

DADOS DO MÊS:
- Receitas: R$ ${receitas.toFixed(2)}
- Gastos: R$ ${gastos.toFixed(2)}
- Sobra: R$ ${sobra.toFixed(2)} (${sobra >= 0 ? 'positiva' : 'negativa'})
- Principais categorias de gasto: ${categorias.map((c: any) => `${c.nome} R$${c.valor.toFixed(0)}`).join(', ')}
- Metas ativas: ${metas.map((m: any) => `"${m.nome}" ${m.pct}% concluída`).join(', ') || 'nenhuma'}

REGRAS:
- Tom: parceiro próximo, humano, nunca julgador
- Parágrafo 1 (2-3 frases): avaliação geral do mês com dados concretos
- Parágrafo 2 (2-3 frases): destaque positivo + ponto de atenção
- Termine com exatamente 3 próximos passos concretos no formato JSON:
  {"narrativa":"...parágrafo 1...\n\n...parágrafo 2...","proximos_passos":["passo 1","passo 2","passo 3"]}

Retorne APENAS o JSON válido, sem markdown.`
      }]
    })

    const raw   = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const clean = raw.replace(/\`\`\`json|\`\`\`/g, '').trim()
    const data  = JSON.parse(clean)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[relatorio/summary]', err)
    return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 })
  }
}
