import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt } = await req.json()
    if (!messages || !Array.isArray(messages))
      return NextResponse.json({ error: 'messages obrigatório' }, { status: 400 })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt ?? 'Você é um assistente interno da iMoney. Seja direto e prático.',
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : 'Sem resposta.'
    return NextResponse.json({ content })
  } catch (error) {
    console.error('[/api/admin/agentes]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
