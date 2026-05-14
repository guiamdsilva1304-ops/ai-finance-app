import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const TOPICOS_SEO = [
  'como organizar as finanças pessoais em 2025',
  'o que é reserva de emergência e como montar a sua',
  'tesouro direto para iniciantes: tudo que você precisa saber',
  'como sair das dívidas rapidamente: guia prático',
  'diferença entre IPCA, SELIC e CDI explicada de forma simples',
  'como investir com pouco dinheiro no brasil',
  'cartão de crédito: armadilhas e como usar a seu favor',
  'planejamento financeiro mensal: passo a passo',
  'renda extra: ideias para ganhar mais em 2025',
  'FGTS: como funciona e quando você pode sacar',
  'o que é e como calcular seu patrimônio líquido',
  'metas financeiras inteligentes: como definir e alcançar',
]

export async function runSeoAgent(mission: any): Promise<string> {
  const { data: existentes } = await supabase
    .from('blog_posts')
    .select('title')
    .order('created_at', { ascending: false })
    .limit(20)

  const titulosExistentes = (existentes || []).map((p: any) => p.title.toLowerCase())

  const topico = TOPICOS_SEO.find(
    t => !titulosExistentes.some(e => e.includes(t.split(' ')[2]))
  ) || TOPICOS_SEO[Math.floor(Math.random() * TOPICOS_SEO.length)]

  const prompt = `Você é o agente SEO da iMoney, um app brasileiro de finanças pessoais com IA para jovens adultos.

Escreva um artigo de blog completo e otimizado para SEO sobre: "${topico}"

REGRAS:
- Tom: educativo, próximo, sem jargão excessivo
- Público: jovens brasileiros 18-30 anos
- Tamanho: 800-1200 palavras de conteúdo real
- Inclua: H2s claros, listas quando útil, exemplos práticos com valores em reais
- Mencione o iMoney naturalmente 1-2x como ferramenta que pode ajudar
- Não use markdown com ** ou # — use o formato JSON abaixo

Responda APENAS com este JSON (sem texto antes ou depois):
{
  "title": "título principal do artigo (60-70 chars)",
  "seo_title": "título para SEO (55-65 chars)",
  "seo_description": "meta description (150-160 chars)",
  "excerpt": "resumo do artigo em 2 frases",
  "slug": "slug-em-kebab-case",
  "category": "categoria (ex: Investimentos, Dívidas, Orçamento, Poupança)",
  "tags": ["tag1", "tag2", "tag3"],
  "reading_time_min": 5,
  "content": "conteúdo completo em HTML simples (use <h2>, <p>, <ul>, <li>, <strong>)"
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const artigo = JSON.parse(jsonStr)

  const slugBase = artigo.slug || topico.replace(/\s+/g, '-').toLowerCase()
  const slugFinal = `${slugBase}-${Date.now()}`

  const { error } = await supabase.from('blog_posts').insert({
    slug: slugFinal,
    title: artigo.title,
    excerpt: artigo.excerpt,
    content: artigo.content,
    author: 'iMoney IA',
    category: artigo.category,
    tags: artigo.tags,
    reading_time_min: artigo.reading_time_min || 5,
    published: true,
    published_at: new Date().toISOString(),
    seo_title: artigo.seo_title,
    seo_description: artigo.seo_description,
    generated_by: 'agent:seo',
  })

  if (error) throw new Error(`Erro ao salvar artigo: ${error.message}`)

  return `Artigo publicado: "${artigo.title}" | slug: ${slugFinal} | categoria: ${artigo.category}`
}
