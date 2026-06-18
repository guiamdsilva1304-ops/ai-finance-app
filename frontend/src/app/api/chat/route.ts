import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getBudgetContext } from "@/lib/budget-context";

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

const LIMITE_FREE = 15
const LIMITE_PRO = 50

async function verificarLimite(userId: string): Promise<{ permitido: boolean; usadas: number; limite: number; plano: string }> {
  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('plan, daily_messages_count, daily_messages_date')
    .eq('user_id', userId)
    .single()

  const plano = perfil?.plan ?? 'free'

  if (plano === 'premium') return { permitido: true, usadas: 0, limite: 0, plano }

  const limite = plano === 'pro' ? LIMITE_PRO : LIMITE_FREE

  const hoje = new Date().toISOString().split('T')[0]
  const dataUltimo = perfil?.daily_messages_date ?? null
  const usadas = dataUltimo === hoje ? (perfil?.daily_messages_count ?? 0) : 0

  return { permitido: usadas < limite, usadas, limite, plano }
}

async function incrementarContador(userId: string): Promise<void> {
  const hoje = new Date().toISOString().split('T')[0]

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('daily_messages_count, daily_messages_date')
    .eq('user_id', userId)
    .single()

  const dataUltimo = perfil?.daily_messages_date ?? null
  const countAtual = dataUltimo === hoje ? (perfil?.daily_messages_count ?? 0) : 0

  await supabase
    .from('user_profiles')
    .update({
      daily_messages_count: countAtual + 1,
      daily_messages_date: hoje,
    })
    .eq('user_id', userId)
}

async function callAnthropicWithRetry(client: any, params: any, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (error: any) {
      const isOverloaded = error?.status === 529 || error?.error?.type === 'overloaded_error';
      const isRateLimit = error?.status === 429;
      if ((isOverloaded || isRateLimit) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`Anthropic overloaded, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1})`);
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      throw error;
    }
  }
}

function fvMensal(pmt: number, r: number, n: number): number {
  if (r <= 0) return pmt * n
  return pmt * ((Math.pow(1 + r, n) - 1) / r)
}

// ─── Tipos de memória ─────────────────────────────────────────────────────────
interface AiMemory {
  objetivo_financeiro?: string | null
  sonho_principal?: string | null
  perfil_risco?: string | null
  ultima_preocupacao?: string | null
  habitos_positivos?: string | null
  personalidade_financeira?: string | null
  contexto_familiar?: string | null
}

function buildMemoryBlock(mem: AiMemory | null): string {
  if (!mem) return ''
  const lines = [
    mem.objetivo_financeiro && `- Objetivo financeiro: ${mem.objetivo_financeiro}`,
    mem.sonho_principal     && `- Sonho principal: ${mem.sonho_principal}`,
    mem.perfil_risco        && `- Perfil de risco: ${mem.perfil_risco}`,
    mem.ultima_preocupacao  && `- Última preocupação: ${mem.ultima_preocupacao}`,
    mem.habitos_positivos   && `- Hábitos positivos: ${mem.habitos_positivos}`,
    mem.personalidade_financeira && `- Personalidade financeira: ${mem.personalidade_financeira}`,
    mem.contexto_familiar   && `- Contexto familiar: ${mem.contexto_familiar}`,
  ].filter(Boolean)
  if (lines.length === 0) return ''
  return `\nO QUE VOCÊ JÁ SABE SOBRE ESTE USUÁRIO (memória de conversas anteriores — use para personalizar desde a primeira mensagem):\n${lines.join('\n')}`
}

// ─── Seed inicial do prompt (roda uma vez quando a tabela está vazia) ─────────
const BASE_PROMPT_SEED = `Você é a iMoney — assessor financeiro pessoal com IA para brasileiros de 20-30 anos.

MISSÃO CENTRAL: Não explicar finanças. Executar junto. Cada resposta termina com uma ação concreta e específica.

TOM DE VOZ: Parceiro próximo, direto, humano, acolhedor. Sem julgamentos. Celebra progresso. Acolhe recaídas.

REGRA DE OURO: Toda resposta Pro termina com ▶ Próximo passo: [ação específica com valor real se possível].

PRINCÍPIOS COMPORTAMENTAIS:
- Nunca linguagem de culpa ou julgamento
- Sempre ação concreta no final
- Máximo 250 palavras por resposta
- Parágrafos curtos, linguagem de WhatsApp com amigo culto
- Implementation intentions: especifique QUANDO e COMO ao sugerir uma ação
- Identity language: fale com o usuário como quem ele está se tornando`

async function seedPromptIfEmpty(): Promise<void> {
  try {
    const { count } = await supabase
      .from('assessor_prompts')
      .select('id', { count: 'exact', head: true })
    if ((count ?? 0) > 0) return
    await supabase.from('assessor_prompts').insert({
      version: 1,
      base_prompt: BASE_PROMPT_SEED,
      behavior_rules: '',
      is_active: true,
      generated_by: 'manual',
    })
  } catch { /* silencioso */ }
}

async function getBehaviorRules(): Promise<string> {
  try {
    const { data } = await supabase
      .from('assessor_prompts')
      .select('behavior_rules')
      .eq('is_active', true)
      .maybeSingle()
    return data?.behavior_rules ?? ''
  } catch {
    return ''
  }
}

// ─── Extração de memória (fire-and-forget, usa Haiku) ─────────────────────────
async function extractAndSaveMemory(
  userId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    const hasUser      = messages.some(m => m.role === 'user')
    const hasAssistant = messages.some(m => m.role === 'assistant')
    if (!hasUser || !hasAssistant) {
      console.log('[memory] Pulando: sem troca completa user+assistant')
      return
    }

    const excerpt = messages.slice(-6)
      .map(m => `${m.role === 'user' ? 'Usuário' : 'Assessor'}: ${m.content}`)
      .join('\n\n')

    let extraction
    try {
      extraction = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `Você é um extrator de memória financeira.
Dado um trecho de conversa, extraia fatos sobre o usuário.
Retorne APENAS JSON válido, sem texto adicional, sem markdown, sem backticks.
Campos possíveis: objetivo_financeiro, sonho_principal, perfil_risco, ultima_preocupacao, habitos_positivos, personalidade_financeira, contexto_familiar.
Se não houver informação suficiente para um campo, OMITA-O do JSON — nunca invente, nunca use null.
Exemplo de resposta válida: {"objetivo_financeiro":"juntar 20k para viagem","perfil_risco":"conservador"}`,
        messages: [{ role: 'user', content: `Trecho da conversa:\n${excerpt}` }],
      })
    } catch (apiErr) {
      console.error('[memory] Erro na chamada Haiku:', apiErr)
      return
    }

    const raw = extraction.content[0].type === 'text' ? extraction.content[0].text.trim() : ''
    console.log(`[memory] Resposta bruta do Haiku para ${userId}:`, raw.slice(0, 300))

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      console.warn('[memory] Haiku não retornou JSON válido. Raw:', raw.slice(0, 200))
      return
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(match[0])
    } catch (parseErr) {
      console.error('[memory] Erro ao parsear JSON do Haiku:', parseErr, 'Raw:', match[0].slice(0, 200))
      return
    }

    const camposValidos = new Set([
      'objetivo_financeiro','sonho_principal','perfil_risco',
      'ultima_preocupacao','habitos_positivos','personalidade_financeira','contexto_familiar',
    ])
    const updates: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (camposValidos.has(k) && v && typeof v === 'string' && v.trim()) {
        updates[k] = v.trim()
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log('[memory] Nenhum campo válido extraído da conversa')
      return
    }

    const { error: upsertErr } = await supabase
      .from('user_memory')
      .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

    if (upsertErr) {
      console.error('[memory] Erro no upsert para', userId, ':', upsertErr)
      return
    }

    console.log(`[memory] ${Object.keys(updates).length} campo(s) salvos para ${userId}:`, Object.keys(updates).join(', '))
  } catch (err) {
    console.error('[memory] Erro inesperado na extração:', err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.replace("Bearer ", "") ?? "";

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    // Parseia o body antes das queries para ter context disponível
    const body = await req.json();
    const { messages, context, proactive } = body;

    // Busca memória de IA em paralelo com as demais queries
    const memoryFetch = supabase
      .from('user_memory')
      .select('objetivo_financeiro,sonho_principal,perfil_risco,ultima_preocupacao,habitos_positivos,personalidade_financeira,contexto_familiar')
      .eq('user_id', user.id)
      .maybeSingle()

    const noventa_dias = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const trinta_dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const _now = new Date()
    const inicio_mes = `${_now.getUTCFullYear()}-${String(_now.getUTCMonth() + 1).padStart(2, '0')}-01`

    const [limiteResult, diagnosticoResult, categoriasResult, receitasResult, metasResult, ultimaTxResult, memoryResult] = await Promise.allSettled([
      verificarLimite(user.id),
      supabase.from('user_profiles')
        .select('perfil_financeiro, score_saude, diagnostico_json, renda, gastos_mensais, monthly_available, preferred_save_day')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('transactions')
        .select('categoria, valor')
        .eq('user_id', user.id)
        .eq('tipo', 'gasto')
        .gte('date', inicio_mes),
      supabase.from('transactions')
        .select('descricao, valor, date, categoria')
        .eq('user_id', user.id)
        .eq('tipo', 'receita')
        .gte('date', noventa_dias),
      supabase.from('metas')
        .select('nome, valor_alvo, valor_atual, prazo')
        .eq('user_id', user.id),
      supabase.from('transactions')
        .select('descricao, valor, tipo, categoria, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      memoryFetch,
    ])

    const { permitido, usadas, limite, plano } = limiteResult.status === 'fulfilled'
      ? limiteResult.value
      : { permitido: true, usadas: 0, limite: 10, plano: 'free' }
    const perfilDiagnostico = diagnosticoResult.status === 'fulfilled' ? diagnosticoResult.value.data : null
    const aiMemory = memoryResult?.status === 'fulfilled' ? (memoryResult.value.data as AiMemory | null) : null
    const memoryBlock = buildMemoryBlock(aiMemory)
    const metasServidor = metasResult.status === 'fulfilled' ? (metasResult.value.data ?? []) : []
    const metasParaPrompt = metasServidor.length > 0 ? metasServidor : (context?.metas ?? [])

    if (!permitido) {
      return NextResponse.json({
        error: `Limite diário atingido`,
        limite_atingido: true,
        usadas,
        limite,
        plano,
        mensagem: `Você usou ${usadas} de ${limite} mensagens hoje. Assine o Pro (50/dia) ou Premium (ilimitado) para continuar.`,
      }, { status: 429 })
    }

    const isPro = plano === 'pro' || plano === 'premium'

    // ─── Contexto comportamental (progresso recente + implementation intentions) ─
    const ultimaTx = ultimaTxResult.status === 'fulfilled' ? ultimaTxResult.value.data : null
    const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
    const saveDay = perfilDiagnostico?.preferred_save_day
    const diaGuardar = typeof saveDay === 'number' && saveDay >= 0 && saveDay <= 6 ? DIAS_SEMANA[saveDay] : null

    const ultimaAcaoBlock = ultimaTx
      ? `\nÚLTIMA AÇÃO DO USUÁRIO: registrou ${ultimaTx.tipo === 'receita' ? 'uma receita' : 'um gasto'} de R$ ${Number(ultimaTx.valor).toFixed(0)} (${ultimaTx.descricao ?? ultimaTx.categoria}) em ${new Date(ultimaTx.created_at).toLocaleDateString('pt-BR')}.`
      : ''

    const comportamentoBlock = `
PRINCÍPIOS COMPORTAMENTAIS — siga em TODA resposta:
- Antes de qualquer conselho, reconheça em UMA frase curta o progresso recente do usuário (use a última ação registrada quando existir — registrar qualquer coisa já é progresso).
- Implementation intentions: ao sugerir uma ação, especifique QUANDO e COMO. ${diaGuardar ? `O usuário escolheu ${diaGuardar} como dia de guardar — ancore as sugestões nesse dia (ex: "nesta ${diaGuardar}, antes das 18h").` : `Ex: "Que tal transferir R$ X para sua reserva nesta sexta-feira, antes das 18h?"`}
- Identity language: fale com o usuário como quem ele está se tornando. Ex: "Como alguém que está construindo patrimônio, você provavelmente vai querer...".
- NUNCA use linguagem de culpa: "você deveria ter", "você está gastando demais", "isso foi um erro" são proibidos. Recaída é dado, não falha.
- Termine TODA resposta com UMA pergunta aberta curta que convide à próxima interação${isPro ? ' (depois do ▶ Próximo passo)' : ''}.
${ultimaAcaoBlock}`

    // ─── Gastos por categoria (Pro/Premium) ───────────────────────────────────
    type CategoriaItem = { categoria: string; total: number; percentual: number }
    let categorias: CategoriaItem[] = []
    if (isPro && categoriasResult.status === 'fulfilled') {
      const txs = categoriasResult.value.data
      const mapaCategoria: Record<string, number> = {}
      for (const tx of txs ?? []) {
        mapaCategoria[tx.categoria] = (mapaCategoria[tx.categoria] ?? 0) + Number(tx.valor)
      }
      const totalGastos = Object.values(mapaCategoria).reduce((a, b) => a + b, 0)
      categorias = Object.entries(mapaCategoria)
        .sort(([, a], [, b]) => b - a)
        .map(([categoria, total]) => ({
          categoria,
          total,
          percentual: totalGastos > 0 ? Math.round((total / totalGastos) * 100) : 0,
        }))
    }

    let categoriasBlock = ''
    if (isPro && categorias.length > 0) {
      const linhas: string[] = ['\n### Gastos por categoria (mês atual):']
      categorias.forEach(c => {
        linhas.push(`  • ${c.categoria}: R$ ${c.total.toFixed(0)} (${c.percentual}% dos gastos)`)
      })
      const top = categorias[0]
      if (top.percentual >= 30) {
        linhas.push(`\n> ⚠️ "${top.categoria}" representa ${top.percentual}% dos gastos. Sugira proativamente redução nessa categoria.`)
      }
      categoriasBlock = linhas.join('\n')
    }

    // ─── Análise de receitas reais (Pro/Premium) ──────────────────────────────
    let receitasBlock = ''
    if (isPro && receitasResult.status === 'fulfilled') {
      const rxs = receitasResult.value.data ?? []

      // Agrupa por mês (YYYY-MM) e por fonte (descrição)
      const porMes: Record<string, number> = {}
      const porFonte: Record<string, number> = {}
      for (const rx of rxs) {
        const mes = rx.date.substring(0, 7)
        porMes[mes] = (porMes[mes] ?? 0) + Number(rx.valor)
        const fonte = rx.descricao?.trim() || rx.categoria || 'Receita'
        porFonte[fonte] = (porFonte[fonte] ?? 0) + Number(rx.valor)
      }

      const meses = Object.keys(porMes)
      const totalReceitas = Object.values(porMes).reduce((a, b) => a + b, 0)
      const rendaMediaMensal = meses.length > 0 ? totalReceitas / meses.length : 0

      const topFontes = Object.entries(porFonte)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)

      if (rendaMediaMensal > 0) {
        // Cálculo de sugestão de investimento
        const sobra = Number(context?.sobra ?? 0)
        const sugestaoBase = rendaMediaMensal * 0.20           // 20% da renda
        const capSobra = sobra > 0 ? sobra * 0.50 : 0         // máx 50% da sobra
        const sugestaoFinal = sobra > 0 ? Math.min(sugestaoBase, capSobra) : 0
        const pctRenda = rendaMediaMensal > 0 ? Math.round((sugestaoFinal / rendaMediaMensal) * 100) : 0

        // Projeção com Tesouro Selic
        const selic = Number(context?.selic ?? 14.50)
        const r = selic / 100 / 12

        const linhas: string[] = ['\n### Análise de receitas reais (últimos 90 dias):']
        linhas.push(`  • Renda média mensal: R$ ${rendaMediaMensal.toFixed(0)}`)
        if (topFontes.length > 0) {
          const fontesStr = topFontes.map(([d, v]) => `${d} (R$ ${v.toFixed(0)})`).join(', ')
          linhas.push(`  • Fontes identificadas: ${fontesStr}`)
        }

        if (sugestaoFinal > 0) {
          linhas.push(`  • Sugestão de investimento mensal: R$ ${sugestaoFinal.toFixed(0)} (${pctRenda}% da renda)`)
          linhas.push(`  • Projeção acumulada investindo R$ ${sugestaoFinal.toFixed(0)}/mês (Tesouro Selic ${selic}%):`)
          linhas.push(`    - 1 ano:  R$ ${fvMensal(sugestaoFinal, r, 12).toFixed(0)}`)
          linhas.push(`    - 5 anos: R$ ${fvMensal(sugestaoFinal, r, 60).toFixed(0)}`)
          linhas.push(`    - 10 anos: R$ ${fvMensal(sugestaoFinal, r, 120).toFixed(0)}`)
          linhas.push(`\n> Use estes valores quando o usuário perguntar quanto deve investir ou como aplicar a renda dele. Cite a fonte de renda identificada pelo nome (ex: "${topFontes[0]?.[0] ?? 'salário'}").`)
        } else if (sobra <= 0) {
          linhas.push(`\n> ⚠️ Sobra negativa ou zero. Foque em equilibrar antes de sugerir investimentos. Não insista em poupar se o usuário está no negativo.`)
        } else {
          linhas.push(`\n> Há renda registrada mas sobra insuficiente para sugestão segura. Valide os gastos antes de recomendar aportes.`)
        }
        receitasBlock = linhas.join('\n')
      }
    }

    // ─── FREE ────────────────────────────────────────────────────────────────
    const systemPromptFree = `Você é a iMoney — a plataforma que transforma sonhos financeiros em planos executáveis. Fale como um parceiro próximo: direto, humano, sem enrolação.

MISSÃO: Não explicar finanças. Mostrar o próximo passo concreto.

TOM DE VOZ:
- Nunca julgue, nunca use linguagem de banco
- Sem conceitos, sem lições — só ações
- Máximo 120 palavras por resposta

DADOS DO USUÁRIO:
- Renda mensal: R$ ${Number(context?.renda ?? 0).toFixed(2)}
- Gastos mensais: R$ ${Number(context?.gastos ?? 0).toFixed(2)}
- Sobra mensal: R$ ${Number(context?.sobra ?? 0).toFixed(2)}
- Metas: ${JSON.stringify(metasParaPrompt)}

PROATIVIDADE EM TRANSAÇÕES:
Quando o usuário mencionar um gasto ou receita, inclua ao final UMA observação curta sobre o impacto — ex: "Isso representa X% da sua sobra mensal" ou "Com isso você fica mais perto da sua meta de [nome]." Seja conciso e positivo.

COMO RESPONDER:
- Responda a pergunta com uma direção clara e prática
- Sempre termine com UMA ação pequena e concreta que o usuário pode fazer hoje
- Nunca diga "você deveria aprender sobre X" — diga "faça X"
- Não cruze dados entre categorias nem analise padrões históricos
- Quando análise mais profunda realmente ajudaria, adicione de forma natural (não em toda resposta): "💡 No Pro, eu analiso isso com os seus dados reais e te mostro exatamente o que fazer."
${comportamentoBlock}
${memoryBlock}

ECONOMIA:
- SELIC: ${context?.selic ?? 14.50}% a.a.
- IPCA: ${context?.ipca_anual ?? 5.48}%`

    // ─── PRO ─────────────────────────────────────────────────────────────────
    const systemPromptPro = `Você é a iMoney — a plataforma que conhece os sonhos do usuário, monta o plano e executa junto. Fale como um parceiro próximo que entende muito de finanças: direto, humano, acolhedor.

MISSÃO CENTRAL: Não explicar finanças. Executar junto. Cada resposta termina com UMA ação concreta que o usuário pode fazer hoje ou esta semana.

TOM DE VOZ — siga sempre:
- NUNCA: "Suas despesas superaram o orçamento em 23%." → SEMPRE: "Ei! Você gastou um pouco mais este mês — quer ajustar sua meta?"
- NUNCA: "Você cometeu um erro financeiro." → SEMPRE: "Esse mês saiu diferente do planejado. Sem problema — vamos recalcular a rota."
- NUNCA: "Recomendamos diversificação do portfólio." → SEMPRE: "Que tal começar a investir? Com R$100/mês você já dá um passo enorme."
- NUNCA: "Você deveria aprender sobre X." → SEMPRE: "Faz X agora — é mais simples do que parece."
- Sem julgamentos. Celebre progresso. Acolha recaídas. Mostre sempre o próximo passo.

REGRA DE OURO — AÇÃO OBRIGATÓRIA:
Toda resposta deve terminar com:
▶ **Próximo passo:** [ação específica com valor real se possível]
Exemplo: "▶ **Próximo passo:** Separa R$ 300 hoje para a reserva — isso já é 60% da sua meta mensal."
Omita APENAS se o usuário estiver em momento emocional difícil — nesse caso, acolha primeiro, ação depois.

DADOS COMPLETOS DO USUÁRIO:
- Idade: ${context?.idade ?? "não informada"}
- Ocupação: ${context?.ocupacao ?? "não informada"}
- Cidade: ${context?.cidade ?? ""}/${context?.estado ?? ""}
- Renda mensal declarada: R$ ${Number(context?.renda ?? perfilDiagnostico?.renda ?? 0).toFixed(2)}
- Gastos mensais declarados: R$ ${Number(context?.gastos ?? perfilDiagnostico?.gastos_mensais ?? 0).toFixed(2)}
- Sobra mensal (transações reais): R$ ${Number(context?.sobra ?? 0).toFixed(2)}
- Disponível por mês (renda − gastos declarados): R$ ${Number(context?.monthly_available ?? perfilDiagnostico?.monthly_available ?? 0).toFixed(2)}
- Gastos por categoria (mês atual): ${JSON.stringify(context?.gastosCat ?? {})}
- Metas: ${JSON.stringify(metasParaPrompt)}
${categoriasBlock}
${receitasBlock}
- Plano: Pro ✨

RACIOCÍNIO FINANCEIRO — use para personalizar cada resposta:
- Se "Disponível por mês" > 0: o usuário TEM margem. Sugira onde alocar essa margem de forma concreta (reserva, meta, investimento) com valor real.
- Se "Disponível por mês" ≤ 0: priorize equilíbrio antes de qualquer meta. Pergunte onde está o maior gasto e proponha 1 corte específico.
- Use sempre o menor valor entre "Sobra real" e "Disponível declarado" ao calcular aportes sugeridos — seja conservador.
- Nunca sugira aportes acima de 30% da renda sem o usuário pedir explicitamente.

INVESTIMENTO — como responder perguntas sobre quanto investir:
- Use a "Sugestão de investimento mensal" da análise de receitas reais quando disponível
- Cite a fonte de renda pelo nome identificado nas transações (ex: "com seu salário de R$1.000")
- Sempre mostre o que o valor vira em 1, 5 e 10 anos com Tesouro Selic
- Se sobra for negativa: não force investimento — foque no equilíbrio primeiro
- Primeiro destino da sobra: reserva de emergência (3-4 meses de gastos). Depois investimentos.

DETECÇÃO DE PADRÕES — use os dados para agir, não para explicar:
- Se houver categoria com gasto acima do esperado, mencione de forma acolhedora e proponha ajuste
- Se a sobra mensal for negativa ou próxima de zero, priorize isso acima de qualquer outra coisa
- Se houver meta com prazo próximo, mencione o progresso proativamente
- Não descreva o padrão ao usuário — aja em cima dele: "Vejo que você gasta R$ X em Y — quer ajustar isso agora?"

PROATIVIDADE EM TRANSAÇÕES — OBRIGATÓRIO:
Sempre que a mensagem do usuário mencionar um gasto ou uma receita (registro, confirmação ou comentário sobre um valor gasto/recebido), inclua ao final da resposta UMA linha de observação proativa sobre o impacto financeiro dessa transação. Use os dados reais:
- Gastos por categoria do mês atual: compare se a categoria está dentro ou acima do padrão do mês
- Metas ativas: calcule quanto falta ou como essa transação aproxima/afasta da meta mais relevante
- Sobra mensal: se o gasto for significativo em relação à sobra, sinalize
Formato: frase curta e direta, com valor concreto quando possível.
Exemplos: "Esse gasto está dentro do seu padrão de alimentação deste mês ✅" | "Com esse gasto, você precisa de R$X para atingir [meta]." | "Essa entrada te deixa R$X mais perto da sua reserva." | "⚠️ Você já usou R$X em [categoria] este mês."
Quando a mensagem for apenas um registro de transação (sem outra pergunta), a observação proativa substitui o ▶ Próximo passo.

CELEBRAÇÃO DE PROGRESSO:
- Quando o usuário mencionar que atingiu qualquer marco em uma meta, celebre genuinamente antes de continuar
- Progresso pequeno merece reconhecimento — não minimize
- Uma conquista financeira, por menor que seja, é um comportamento a reforçar
${comportamentoBlock}

${context?.ocupacao === 'mei' || context?.ocupacao === 'autonomo' ? `
PERFIL MEI/AUTÔNOMO:
- Prioridade 1: reserva de 6-8 meses antes de qualquer outra meta — renda variável exige isso
- DAS MEI vence dia 20 — mencione quando relevante
- Ação concreta: se ainda não separou conta PJ da pessoal, este é o primeiro passo
- INSS MEI cobre só aposentadoria por idade — ação: definir um aporte complementar mensal` : ''}
${context?.ocupacao === 'clt' ? `
PERFIL CLT:
- FGTS acumula 8% do salário — inclua no cálculo de patrimônio e metas
- 13º em dezembro — se ainda não tem destino planejado, defina agora
- Reserva de 3-4 meses é suficiente pela estabilidade do vínculo
- PLR e férias: aportes extras que podem acelerar metas — planeje antes de receber` : ''}
${context?.ocupacao === 'empresario' ? `
PERFIL EMPRESÁRIO:
- Primeira pergunta: pró-labore fixo está definido? Se não, defina um valor agora
- Reserva de 8-12 meses pela variabilidade da receita
- Separação total PJ/pessoal é inegociável — mencione se ainda não foi feita` : ''}
${context?.ocupacao === 'estudante' ? `
PERFIL ESTUDANTE:
- Começa pequeno: R$50-100/mês já cria o hábito que vai durar décadas
- Primeira ação concreta: abrir conta no Tesouro Direto e comprar Tesouro Selic
- Foco em construir o hábito antes de escolher produtos` : ''}

${perfilDiagnostico?.diagnostico_json ? `
MEMÓRIA FINANCEIRA DO USUÁRIO — use para personalizar cada resposta:
- Perfil: ${perfilDiagnostico.diagnostico_json.perfil_nome} ${perfilDiagnostico.diagnostico_json.perfil_emoji}
- ${perfilDiagnostico.diagnostico_json.descricao}
- Score de saúde: ${perfilDiagnostico.score_saude ?? perfilDiagnostico.diagnostico_json.score}/1000
- Como se sente sobre dinheiro: ${perfilDiagnostico.diagnostico_json.respostas?.[1] ?? 'não informado'}
- Maior desafio declarado: ${perfilDiagnostico.diagnostico_json.respostas?.[2] ?? 'não informado'}
- Reserva de emergência: ${perfilDiagnostico.diagnostico_json.respostas?.[3] ?? 'não informado'}
- Objetivo principal: ${perfilDiagnostico.diagnostico_json.respostas?.[5] ?? 'não informado'}
- Prioridades dos próximos 30 dias: ${(perfilDiagnostico.diagnostico_json.prioridades ?? []).join(' | ')}

A iMoney conhece este usuário. Use essa memória para personalizar TODAS as respostas desde a primeira mensagem. Se o usuário mencionar algo que contradiz o diagnóstico, pergunte o que mudou — a memória evolui com ele.` : ''}
${memoryBlock}

ECONOMIA:
- SELIC: ${context?.selic ?? 14.50}% a.a.
- IPCA anual: ${context?.ipca_anual ?? 5.48}%

COMO RESPONDER:
- Parágrafos curtos, como conversa de WhatsApp com um amigo culto
- Direto: resposta logo, sem introduções longas
- Use números concretos (ex: "guarda R$ 300 por mês")
- Prefira texto corrido a listas — só use listas para 4+ itens que precisam ser enumerados
- NUNCA use tabelas markdown
- Máximo 1 emoji por resposta, só se natural
- Negrito só para o "▶ Próximo passo" e para valores importantes
- Máximo 250 palavras por resposta

PLANOS DE METAS — regra especial:
Quando o usuário pedir um plano para alcançar uma meta, responda com 1-2 frases motivadoras e depois retorne exatamente este bloco:

\`\`\`plano
{"meta":"nome da meta","prazo_total":"X meses","valor_alvo":0,"fases":[{"numero":1,"titulo":"Título curto da fase","duracao":"Mês 1-2","descricao":"O que acontece nesta fase e por quê é importante (2-3 frases)","acoes":["Ação concreta 1","Ação concreta 2","Ação concreta 3"],"meta_parcial":"R$ X guardados ou marco atingido"},{"numero":2}]}
\`\`\`

Regras do plano:
- Use 3 a 5 fases com progressão lógica
- Cada fase: 2-4 ações concretas e realistas
- Use os dados reais do usuário (renda, sobra, meta, prazo) para calcular valores
- Fase 1 sempre começa pelos fundamentos (reserva ou hábito)
- Última fase inclui o marco final da conquista`

    const [behaviorRules, budgetCtx] = await Promise.all([getBehaviorRules(), getBudgetContext(supabase, user.id)])
    const behaviorBlock = behaviorRules.trim()
      ? `\n\nREGRAS DE COMPORTAMENTO ADICIONAIS (atualizadas com base no feedback dos usuários):\n${behaviorRules.trim()}`
      : ''
    const systemPrompt = (isPro ? systemPromptPro : systemPromptFree) + behaviorBlock + (budgetCtx ? `\n\n${budgetCtx}` : '')

    // Semente do prompt na primeira requisição (fire-and-forget)
    seedPromptIfEmpty().catch(() => {})

    const response = await callAnthropicWithRetry(client, {
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";

    const ultimaMensagem = messages[messages.length - 1]
    // proactive=true: prompt gerado internamente (ex: abertura pós-score), salva só a resposta do assistente
    const historyInserts = proactive
      ? [{ user_id: user.id, role: 'assistant', content: reply, created_at: new Date().toISOString() }]
      : ultimaMensagem?.role === 'user'
        ? [
            { user_id: user.id, role: 'user', content: ultimaMensagem.content, created_at: new Date().toISOString() },
            { user_id: user.id, role: 'assistant', content: reply, created_at: new Date().toISOString() },
          ]
        : []
    await Promise.allSettled([
      historyInserts.length ? supabase.from('chat_history').insert(historyInserts) : Promise.resolve(),
      plano !== 'premium' ? incrementarContador(user.id) : Promise.resolve(),
    ])

    // Fire-and-forget: extrai insights da conversa e salva em user_memory
    // Só roda em trocas reais (não em mensagens proativas do sistema)
    if (!proactive && messages.length >= 1) {
      const fullConversation = [
        ...messages,
        { role: 'assistant', content: reply },
      ]
      extractAndSaveMemory(user.id, fullConversation).catch(() => {})
    }

    return NextResponse.json({
      reply,
      usadas: plano === 'premium' ? 0 : usadas + 1,
      limite,
      plano,
      gastos_categorias: isPro ? categorias : undefined,
    })
  } catch (err: unknown) {
    console.error("Chat error:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
