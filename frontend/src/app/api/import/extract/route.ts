import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const formato = formData.get('formato') as string

  const conteudo = await file.text()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Você é um assistente financeiro brasileiro. Analise este extrato bancário no formato ${formato.toUpperCase()} e retorne APENAS um JSON válido com as transações, sem nenhum texto adicional.

Formato de saída:
{
  "transacoes": [
    {
      "data": "YYYY-MM-DD",
      "descricao": "descrição limpa e legível",
      "valor": -150.00,
      "categoria": "uma de: alimentação, transporte, moradia, saúde, lazer, educação, investimentos, salário, freelance, outros",
      "tipo": "despesa ou receita"
    }
  ]
}

Regras:
- valor negativo = despesa
- valor positivo = receita
- descricao deve ser limpa, sem códigos bancários
- categoria deve ser uma das opções listadas

Extrato:
${conteudo.substring(0, 8000)}`
    }]
  })

  const texto = response.content[0].type === 'text' ? response.content[0].text : ''

  let transacoes = []
  try {
    const clean = texto.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    transacoes = parsed.transacoes || []
  } catch {
    return NextResponse.json({ error: 'Erro ao processar arquivo' }, { status: 400 })
  }

  const inserir = transacoes.map((t: any) => ({
    user_id: user.id,
    data: t.data,
    descricao: t.descricao,
    valor: t.valor,
    categoria: t.categoria,
    tipo: t.tipo,
    importado_via: formato
  }))

  const { error } = await supabase.from('transactions').insert(inserir)

  await supabase.from('import_logs').insert({
    user_id: user.id,
    arquivo_nome: file.name,
    formato,
    total_transacoes: transacoes.length,
    importadas: inserir.length,
    duplicadas: 0
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    sucesso: true,
    importadas: inserir.length,
    transacoes
  })
}
