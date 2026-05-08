import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function runConteudoAgent(mission: any): Promise<string> {
  const { data: recentes } = await supabase
    .from('content_pipeline')
    .select('tema, plataforma')
    .order('criado_em', { ascending: false })
    .limit(10)

  const temasRecentes = (recentes || []).map((p: any) => p.tema).join(', ')

  const semana = obterSemanaAtual()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Você é o agente de Conteúdo da iMoney, app brasileiro de finanças pessoais com IA para jovens adultos (18-30 anos).

Estamos na ${semana}. Crie um plano de 3 posts para Instagram/TikTok desta semana.

Temas já usados recentemente (EVITE): ${temasRecentes || 'nenhum ainda'}

FORMATO VISUAL iMoney: fundo branco, verde escuro #1a3a1a e verde vibrante #00C853, tipografia bold, flat design brasileiro.
ESTRATÉGIA: Fase 1 = conteúdo 100% educativo (sem mencionar o app diretamente ainda).
MELHORES HORÁRIOS: Terça e Quinta 19h-21h.

Responda APENAS com este JSON (array de 3 posts):
[
  {
    "plataforma": "Instagram",
    "formato": "carrossel",
    "tema": "tema do post",
    "gancho": "primeira frase que para o scroll",
    "slides": [
      { "numero": 1, "titulo": "texto do slide", "corpo": "conteúdo" }
    ],
    "legenda": "legenda completa com emojis e hashtags (max 2200 chars)",
    "cta": "call to action do post",
    "melhor_horario": "ex: Terça 19h",
    "prompt_imagem": "prompt detalhado em português para gerar imagem de capa no Gemini. Descreva composição, cores (#1a3a1a, #00C853, branco), elementos visuais, estilo flat design, SEM texto na imagem, formato 1:1."
  }
]`
    }]
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const posts = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

  const inserts = posts.map((post: any) => ({
    agent_id: 'conteudo',
    tipo: post.formato,
    titulo: `${post.plataforma}: ${post.tema}`,
    conteudo: JSON.stringify(post),
    tema: post.tema,
    plataforma: post.plataforma,
    metadata: {
      plataforma: post.plataforma,
      tema: post.tema,
      melhor_horario: post.melhor_horario,
      mission_id: mission.id,
    },
    status: 'pendente',
  }))

  const { error } = await supabase.from('content_pipeline').insert(inserts)
  if (error) throw new Error(`Erro ao salvar posts: ${error.message}`)

  const temas = posts.map((p: any) => p.tema).join(' | ')
  return `${posts.length} posts gerados para ${semana} | Temas: ${temas}`
}

function obterSemanaAtual(): string {
  const agora = new Date()
  const inicio = new Date(agora)
  inicio.setDate(agora.getDate() - agora.getDay() + 1)
  const fim = new Date(inicio)
  fim.setDate(inicio.getDate() + 6)

  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `semana de ${fmt(inicio)} a ${fmt(fim)}`
}
