import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function runGrowthAgent(mission: any): Promise<string> {
  const tipo = mission.titulo?.toLowerCase()

  if (tipo?.includes('reativar') || tipo?.includes('inativos')) {
    return await reativarInativos(mission)
  }

  if (tipo?.includes('upgrade') || tipo?.includes('pro')) {
    return await campanhaUpgrade(mission)
  }

  return await reativarInativos(mission)
}

async function reativarInativos(mission: any): Promise<string> {
  const seteDiasAtras = new Date()
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

  const { data: inativos, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, nome, perfil, renda, gastos, onboarding_completo')
    .eq('followup_sent', false)
    .lt('last_login_at', seteDiasAtras.toISOString())
    .not('last_login_at', 'is', null)
    .limit(50)

  if (error) throw new Error(`Erro ao buscar inativos: ${error.message}`)
  if (!inativos || inativos.length === 0) return 'Nenhum usuário inativo para reativar.'

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Você é o agente Growth da iMoney, app brasileiro de finanças pessoais com IA.

Crie um email de reativação para usuários inativos. Tom: amigável, sem pressão, genuinamente útil.

Responda APENAS com este JSON:
{
  "subject": "assunto do email (max 60 chars)",
  "preview": "preview text (max 90 chars)",
  "body_html": "corpo do email em HTML simples com <p>, <strong>, <a href='https://imoney.ia.br/dashboard'>Acessar iMoney</a>. Máximo 200 palavras. Mencione que o assessor de IA pode ajudar a organizar as finanças."
}`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const first = raw.indexOf('{'), last = raw.lastIndexOf('}')
  const emailData = JSON.parse(first !== -1 ? raw.slice(first, last + 1) : raw)

  const inserts = inativos.map((u: { user_id: string; email: string; [key: string]: unknown }) => ({
    user_id: u.user_id,
    email: u.email,
    tipo: 'reativacao',
    type: 'reativacao',
    subject: emailData.subject,
    body_html: emailData.body_html,
    status: 'pendente',
    scheduled_for: new Date().toISOString(),
    metadata: { agent: 'growth', mission_id: mission.id, subject: emailData.subject, body_html: emailData.body_html },
  }))

  const { error: insertError } = await supabase.from('email_queue').insert(inserts)
  if (insertError) throw new Error(`Erro ao inserir email_queue: ${insertError.message}`)

  const userIds = inativos.map((u: any) => u.user_id)
  await supabase.from('user_profiles')
    .update({ followup_sent: true })
    .in('user_id', userIds)

  return `Reativação: ${inativos.length} emails agendados | assunto: "${emailData.subject}"`
}

async function campanhaUpgrade(mission: any): Promise<string> {
  const { data: candidatos, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, nome, chat_messages_this_month, plan')
    .eq('plan', 'free')
    .gte('chat_messages_this_month', 3)
    .limit(100)

  if (error) throw new Error(`Erro ao buscar candidatos Pro: ${error.message}`)
  if (!candidatos || candidatos.length === 0) return 'Nenhum candidato para upgrade encontrado.'

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Você é o agente Growth da iMoney. Crie um email de upgrade para o plano Pro (R$29,90/mês).

O usuário já está usando ativamente o app e o assessor de IA. Foque no valor, não na pressão.
Mencione: assessor ilimitado, análise financeira profunda, relatórios personalizados.

Responda APENAS com este JSON:
{
  "subject": "assunto (max 60 chars)",
  "preview": "preview text (max 90 chars)",
  "body_html": "corpo em HTML simples, max 200 palavras, inclua link <a href='https://imoney.ia.br/dashboard/pro'>Ver plano Pro</a>"
}`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const first = raw.indexOf('{'), last = raw.lastIndexOf('}')
  const emailData = JSON.parse(first !== -1 ? raw.slice(first, last + 1) : raw)

  const inserts = candidatos.map((u: { user_id: string; email: string; [key: string]: unknown }) => ({
    user_id: u.user_id,
    email: u.email,
    tipo: 'upgrade_pro',
    type: 'upgrade_pro',
    subject: emailData.subject,
    body_html: emailData.body_html,
    status: 'pendente',
    scheduled_for: new Date().toISOString(),
    metadata: { agent: 'growth', mission_id: mission.id, chat_msgs: u.chat_messages_this_month, subject: emailData.subject, body_html: emailData.body_html },
  }))

  const { error: insertError } = await supabase.from('email_queue').insert(inserts)
  if (insertError) throw new Error(`Erro ao inserir emails upgrade: ${insertError.message}`)

  return `Upgrade Pro: ${candidatos.length} emails agendados | assunto: "${emailData.subject}"`
}
