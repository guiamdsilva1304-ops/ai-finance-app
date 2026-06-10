import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'sk-ant-placeholder' })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    const token = auth?.replace('Bearer ', '') ?? ''
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { renda, gastos, tem_divida, valor_divida, reserva, objetivo } = await req.json()

    if (!renda || renda <= 0) return NextResponse.json({ error: 'Renda inválida' }, { status: 400 })

    const sobra = renda - gastos
    const taxaPoupanca = renda > 0 ? ((sobra / renda) * 100).toFixed(1) : '0'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'Você é especialista em finanças pessoais para jovens brasileiros. Responda APENAS com JSON válido sem markdown.',
      messages: [{
        role: 'user',
        content: `Gere um Score iMoney (0-100) para este perfil financeiro:

Renda mensal: R$ ${renda}
Gastos fixos: R$ ${gastos}
Sobra mensal: R$ ${sobra} (${taxaPoupanca}% da renda)
Dívidas: ${tem_divida ? `Sim — R$ ${valor_divida ?? 0} total` : 'Não tem dívidas'}
Reserva de emergência: ${reserva}
Objetivo: ${objetivo}

Critérios do score:
- 0-30: crítico (dívidas altas, sem reserva, gastos ≥ renda)
- 31-50: atenção (dívidas, pouca reserva, sobra pequena)
- 51-70: estável (alguma reserva, gastos controlados)
- 71-85: saudável (boa reserva, sobra consistente, sem dívidas)
- 86-100: excelente (reserva completa, alta taxa de poupança, investindo)

Retorne JSON:
{"score":número 0-100,"titulo":"nome do nível (Iniciando a Jornada | Construindo Bases | No Caminho Certo | Finanças Saudáveis | Mestre das Finanças)","resumo":"2-3 frases honestas e motivadoras sobre a situação atual","pontos_fortes":["ponto forte 1","ponto forte 2"],"riscos":["risco 1","risco 2"],"plano_30_dias":["ação concreta 1","ação concreta 2","ação concreta 3"]}`,
      }],
    })

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Resposta inválida da IA')
    const scoreData = JSON.parse(match[0])

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('diagnostico_json')
      .eq('user_id', user.id)
      .maybeSingle()

    const novosDados = {
      score_saude: scoreData.score,
      diagnostico_json: {
        ...(existingProfile?.diagnostico_json ?? {}),
        score_imoney: {
          ...scoreData,
          renda,
          gastos,
          tem_divida,
          valor_divida: valor_divida ?? 0,
          reserva,
          objetivo,
          gerado_em: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    }

    // user_profiles.id pode divergir de user_id — upsert pela PK criaria perfil duplicado
    if (existingProfile) {
      await supabase.from('user_profiles').update(novosDados).eq('user_id', user.id)
    } else {
      await supabase.from('user_profiles').insert({ user_id: user.id, ...novosDados })
    }

    return NextResponse.json({ scoreData })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[SCORE]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
