import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function runDadosAgent(mission: any): Promise<string> {
  const agora = new Date()
  const seteDiasAtras = new Date(agora)
  seteDiasAtras.setDate(agora.getDate() - 7)

  const [
    { count: totalUsers },
    { count: novosUsuarios7d },
    { count: usuariosPro },
    { count: totalMensagens7d },
    { count: totalTransacoes },
    { data: blogStats },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', seteDiasAtras.toISOString()),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .eq('is_pro', true),
    supabase.from('chat_history').select('*', { count: 'exact', head: true })
      .gte('created_at', seteDiasAtras.toISOString()),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
    supabase.from('blog_posts').select('title, created_at')
      .gte('created_at', seteDiasAtras.toISOString())
      .order('created_at', { ascending: false }),
  ])

  const metricas = {
    total_usuarios: totalUsers || 0,
    novos_usuarios_7d: novosUsuarios7d || 0,
    usuarios_pro: usuariosPro || 0,
    taxa_conversao: totalUsers ? ((usuariosPro || 0) / (totalUsers || 1) * 100).toFixed(1) + '%' : '0%',
    mensagens_ia_7d: totalMensagens7d || 0,
    total_transacoes: totalTransacoes || 0,
    artigos_publicados_7d: blogStats?.length || 0,
    receita_estimada_mes: `R$ ${((usuariosPro || 0) * 29.9).toFixed(2)}`,
    semana: `${seteDiasAtras.toLocaleDateString('pt-BR')} - ${agora.toLocaleDateString('pt-BR')}`,
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Você é o agente de Dados da iMoney, fintech brasileira de finanças pessoais.

Analise estas métricas da semana e gere um relatório executivo com insights acionáveis:

${JSON.stringify(metricas, null, 2)}

CONTEXTO: Break-even = ~22 usuários Pro pagando R$29,90/mês. Burn mensal ~R$660. Estratégia atual: crescimento orgânico via SEO + redes sociais.

Responda APENAS com este JSON:
{
  "titulo": "Relatório Semanal iMoney — [data]",
  "score_saude": 75,
  "resumo_executivo": "2-3 frases do estado geral",
  "destaques": ["ponto positivo 1", "ponto positivo 2"],
  "alertas": ["ponto de atenção 1"],
  "proximas_acoes": ["ação recomendada 1", "ação recomendada 2"],
  "metricas_chave": ${JSON.stringify(metricas)}
}`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const relatorio = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

  await supabase.from('agent_logs').insert({
    agent_id: 'dados',
    tipo: 'relatorio_semanal',
    titulo: relatorio.titulo,
    conteudo: relatorio.resumo_executivo,
    metadata: relatorio,
    status: 'ativo',
  })

  return `Relatório gerado | Score: ${relatorio.score_saude}/100 | Usuários: ${metricas.total_usuarios} | Pro: ${metricas.usuarios_pro} | Receita est.: ${metricas.receita_estimada_mes}`
}
