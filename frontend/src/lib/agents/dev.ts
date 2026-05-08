import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function runDevAgent(mission: any): Promise<string> {
  // Busca logs de erro do Vercel via API
  const vercelToken = process.env.VERCEL_ACCESS_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  let logsTexto = 'Nenhum log disponível.'

  if (vercelToken && projectId) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v1/projects/${projectId}/deployments?limit=1&target=production`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      )
      const data = await res.json()
      const deployId = data?.deployments?.[0]?.uid

      if (deployId) {
        const logsRes = await fetch(
          `https://api.vercel.com/v2/deployments/${deployId}/events?types=error&limit=50`,
          { headers: { Authorization: `Bearer ${vercelToken}` } }
        )
        const logsData = await logsRes.json()
        const erros = (logsData || [])
          .filter((e: any) => e.type === 'error' || e.payload?.level === 'error')
          .map((e: any) => e.payload?.text || e.text || JSON.stringify(e))
          .filter(Boolean)
          .slice(0, 20)

        if (erros.length > 0) {
          logsTexto = erros.join('\n')
        } else {
          logsTexto = 'Nenhum erro encontrado nos logs do último deploy.'
        }
      }
    } catch (err: any) {
      logsTexto = `Erro ao buscar logs: ${err.message}`
    }
  }

  // Claude analisa os logs
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Você é o agente Dev da iMoney. Stack: Next.js 14, TypeScript, Supabase, Vercel.

Analise estes logs de erro do último deploy em produção:

\`\`\`
${logsTexto}
\`\`\`

Responda APENAS com este JSON:
{
  "status": "ok" | "atencao" | "critico",
  "resumo": "resumo em 1-2 frases do estado geral",
  "erros": [
    {
      "tipo": "tipo do erro",
      "descricao": "o que está acontecendo",
      "arquivo": "arquivo provável se identificável",
      "severidade": "baixa" | "media" | "alta",
      "sugestao_fix": "como resolver"
    }
  ],
  "acoes_recomendadas": ["ação 1", "ação 2"]
}`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const analise = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

  // Salva em agent_logs
  const temErros = analise.erros?.length > 0
  await supabase.from('agent_logs').insert({
    agent_id: 'dev',
    tipo: temErros ? 'alerta' : 'info',
    titulo: `Dev Monitor — ${analise.status?.toUpperCase()} — ${new Date().toLocaleDateString('pt-BR')}`,
    conteudo: analise.resumo,
    metadata: analise,
    status: 'ativo',
  })

  const numErros = analise.erros?.length || 0
  return `Status: ${analise.status} | ${numErros} erro(s) encontrado(s) | ${analise.resumo}`
}
