import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const TIPOS = [
  'Ações BR (B3)', 'Ações EUA', 'Ações Europa', 'Ações Outros',
  'FIIs', 'ETF', 'Tesouro Direto', 'CDB/LCI/LCA',
  'Criptomoedas', 'Fundos', 'Previdência', 'Poupança', 'Outro',
]

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json()
    if (!transcript || transcript.trim().length < 3) {
      return NextResponse.json({ erro: 'Transcrição muito curta' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Você é um parser de investimentos para um app financeiro brasileiro. Extraia os dados da fala e retorne APENAS JSON válido, sem markdown.

Fala: "${transcript}"

Campos:
- "nome": string — nome ou ticker do ativo (ex: "PETR4", "XPLG11", "Tesouro Selic 2026", "CDB Nubank", "Bitcoin")
- "tipo": exatamente um de: ${TIPOS.join(', ')}
- "valor": número puro em reais (ex: 500.00)
- "moeda": "BRL" por padrão, ou "USD"/"EUR" se mencionado
- "corretora": string ou null
- "notas": string ou null — observações extras
- "confianca": 0 a 1

Classificação:
- Tickers B3 (PETR4, VALE3, MGLU3...) → "Ações BR (B3)"
- FII/fundo imobiliário/KNRI11/XPLG11 → "FIIs"
- Tesouro Selic/IPCA/Prefixado → "Tesouro Direto"
- CDB/LCI/LCA/LCB → "CDB/LCI/LCA"
- Ações americanas/S&P/VOO/AAPL → "Ações EUA"
- Bitcoin/ETH/cripto → "Criptomoedas"
- ETF → "ETF"

Retorne: {"nome":"PETR4","tipo":"Ações BR (B3)","valor":500.00,"moeda":"BRL","corretora":"XP","notas":null,"confianca":0.95}
Se não entender nome ou valor: {"erro":"Não entendi. Tente: 'Comprei 500 reais de PETR4 na XP'"}`
      }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[voice-investment]', err)
    return NextResponse.json({ erro: 'Falha ao processar. Tente novamente.' }, { status: 500 })
  }
}
