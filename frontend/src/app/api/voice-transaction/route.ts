import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const CATEGORIAS = [
  'Alimentação', 'Transporte', 'Saúde', 'Educação',
  'Lazer', 'Moradia', 'Vestuário', 'Serviços',
  'Salário', 'Freelance', 'Investimentos', 'Outros',
]

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json()
    if (!transcript || transcript.trim().length < 3) {
      return NextResponse.json({ erro: 'Transcrição muito curta' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Você é um assistente de finanças pessoais. Extraia os dados da fala e retorne APENAS JSON válido, sem markdown.

Fala: "${transcript}"

- "tipo": "gasto" para despesas/paguei/custou/comprei. "receita" para salário/recebi/entrou/ganhei
- "valor": número puro (ex: 45.90)
- "descricao": nome curto (ex: "iFood", "Uber", "Mercado")
- "categoria": exatamente uma de: ${CATEGORIAS.join(', ')}
- "confianca": 0 a 1

Retorne: {"tipo":"gasto","valor":45.90,"descricao":"descrição","categoria":"Alimentação","confianca":0.95}
Se não entender: {"erro":"Não entendi. Tente: 'Gastei 50 reais no mercado'"}`
      }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[voice-transaction]', err)
    return NextResponse.json({ erro: 'Falha ao processar. Tente novamente.' }, { status: 500 })
  }
}
