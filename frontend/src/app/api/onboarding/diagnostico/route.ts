import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    const token = auth?.replace('Bearer ', '') ?? ''
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { respostas, nome, ocupacao, renda, meta }: {
      respostas: Record<number, string>
      nome: string
      ocupacao: string
      renda: number
      meta: string
    } = await req.json()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'Você é especialista em finanças pessoais para jovens brasileiros. Responda APENAS com JSON válido sem markdown.',
      messages: [{
        role: 'user',
        content: `Crie um diagnóstico financeiro personalizado para este usuário do iMoney:

Nome: ${nome}
Ocupação: ${ocupacao || 'não informada'}
Renda: R$ ${renda || 0}/mês
Meta principal: ${meta || 'não definida'}

Respostas do questionário:
1. Como se sente com dinheiro: ${respostas[1]}
2. Maior desafio financeiro: ${respostas[2]}
3. Reserva de emergência: ${respostas[3]}
4. Conta inesperada: ${respostas[4]}
5. Objetivo principal: ${respostas[5]}

Retorne JSON:
{"perfil_nome":"nome criativo do perfil (ex: Guerreiro Financeiro, Construtor de Base, Explorador Cauteloso, Poupador Iniciante)","perfil_emoji":"emoji único representativo","descricao":"2 frases honestas e motivadoras sobre o perfil financeiro atual","prioridades":["ação concreta e específica para os próximos 30 dias","ação concreta 2","ação concreta 3"],"score":número inteiro de 0 a 1000 baseado na saúde financeira atual (300-400 se ansioso/sem reserva/dívidas, 500-700 se intermediário, 700+ se reserva e tranquilo),"frase_motivacional":"frase curta e poderosa personalizada para ${nome}"}`,
      }],
    })

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Resposta inválida da IA')
    const diagnostico = JSON.parse(match[0])

    await supabase.from('user_profiles').upsert({
      id: user.id,
      perfil_financeiro: diagnostico.perfil_nome,
      score_saude: diagnostico.score,
      diagnostico_json: {
        ...diagnostico,
        respostas,
        gerado_em: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ diagnostico })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DIAGNOSTICO]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
