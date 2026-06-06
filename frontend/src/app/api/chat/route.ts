import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LIMITE_FREE = 15
const LIMITE_PRO = 50

async function verificarLimite(userId: string): Promise<{ permitido: boolean; usadas: number; limite: number; plano: string }> {
  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('plan, daily_messages_count, daily_messages_date')
    .eq('id', userId)
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
    .eq('id', userId)
    .single()

  const dataUltimo = perfil?.daily_messages_date ?? null
  const countAtual = dataUltimo === hoje ? (perfil?.daily_messages_count ?? 0) : 0

  await supabase
    .from('user_profiles')
    .update({
      daily_messages_count: countAtual + 1,
      daily_messages_date: hoje,
    })
    .eq('id', userId)
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

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.replace("Bearer ", "") ?? "";

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const [limiteResult, diagnosticoResult, categoriasResult] = await Promise.allSettled([
      verificarLimite(user.id),
      supabase.from('user_profiles').select('perfil_financeiro, score_saude, diagnostico_json, renda_mensal, gastos_mensais, monthly_available').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('transactions')
        .select('categoria, valor')
        .eq('user_id', user.id)
        .eq('tipo', 'gasto')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    ])

    const { permitido, usadas, limite, plano } = limiteResult.status === 'fulfilled' ? limiteResult.value : { permitido: true, usadas: 0, limite: 10, plano: 'free' }
    const perfilDiagnostico = diagnosticoResult.status === 'fulfilled' ? diagnosticoResult.value.data : null

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

    const body = await req.json();
    const { messages, context } = body;

    const isPro = plano === 'pro' || plano === 'premium'

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
      const linhas: string[] = ['\n### Gastos por categoria (últimos 30 dias):']
      categorias.forEach(c => {
        linhas.push(`  • ${c.categoria}: R$ ${c.total.toFixed(0)} (${c.percentual}% dos gastos)`)
      })
      const top = categorias[0]
      if (top.percentual >= 30) {
        linhas.push(`\n> ⚠️ "${top.categoria}" representa ${top.percentual}% dos gastos. Sugira proativamente redução nessa categoria.`)
      }
      categoriasBlock = linhas.join('\n')
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

COMO RESPONDER:
- Responda a pergunta com uma direção clara e prática
- Sempre termine com UMA ação pequena e concreta que o usuário pode fazer hoje
- Nunca diga "você deveria aprender sobre X" — diga "faça X"
- Não cruze dados entre categorias nem analise padrões históricos
- Quando análise mais profunda realmente ajudaria, adicione de forma natural (não em toda resposta): "💡 No Pro, eu analiso isso com os seus dados reais e te mostro exatamente o que fazer."

ECONOMIA:
- SELIC: ${context?.selic ?? 14.75}% a.a.
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
- Renda mensal declarada: R$ ${Number(context?.renda ?? perfilDiagnostico?.renda_mensal ?? 0).toFixed(2)}
- Gastos mensais declarados: R$ ${Number(context?.gastos ?? perfilDiagnostico?.gastos_mensais ?? 0).toFixed(2)}
- Sobra mensal (transações reais): R$ ${Number(context?.sobra ?? 0).toFixed(2)}
- Disponível por mês (renda − gastos declarados): R$ ${Number(context?.monthly_available ?? perfilDiagnostico?.monthly_available ?? 0).toFixed(2)}
- Gastos por categoria: ${JSON.stringify(context?.gastosCat ?? {})}
- Metas: ${JSON.stringify(context?.metas ?? [])}
${categoriasBlock}
- Plano: Pro ✨

RACIOCÍNIO FINANCEIRO — use para personalizar cada resposta:
- Se "Disponível por mês" > 0: o usuário TEM margem. Sugira onde alocar essa margem de forma concreta (reserva, meta, investimento) com valor real.
- Se "Disponível por mês" ≤ 0: priorize equilíbrio antes de qualquer meta. Pergunte onde está o maior gasto e proponha 1 corte específico.
- Use sempre o menor valor entre "Sobra real" e "Disponível declarado" ao calcular aportes sugeridos — seja conservador.
- Nunca sugira aportes acima de 30% da renda sem o usuário pedir explicitamente.

DETECÇÃO DE PADRÕES — use os dados para agir, não para explicar:
- Se houver categoria com gasto acima do esperado, mencione de forma acolhedora e proponha ajuste
- Se a sobra mensal for negativa ou próxima de zero, priorize isso acima de qualquer outra coisa
- Se houver meta com prazo próximo, mencione o progresso proativamente
- Não descreva o padrão ao usuário — aja em cima dele: "Vejo que você gasta R$ X em Y — quer ajustar isso agora?"

CELEBRAÇÃO DE PROGRESSO:
- Quando o usuário mencionar que atingiu qualquer marco em uma meta, celebre genuinamente antes de continuar
- Progresso pequeno merece reconhecimento — não minimize
- Uma conquista financeira, por menor que seja, é um comportamento a reforçar

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

ECONOMIA:
- SELIC: ${context?.selic ?? 14.75}% a.a.
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

    const systemPrompt = isPro ? systemPromptPro : systemPromptFree

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

    // Salva histórico e incrementa contador em paralelo
    const ultimaMensagem = messages[messages.length - 1]
    await Promise.allSettled([
      ultimaMensagem?.role === 'user'
        ? supabase.from('chat_history').insert([
            { user_id: user.id, role: 'user', content: ultimaMensagem.content, created_at: new Date().toISOString() },
            { user_id: user.id, role: 'assistant', content: reply, created_at: new Date().toISOString() },
          ])
        : Promise.resolve(),
      plano !== 'premium' ? incrementarContador(user.id) : Promise.resolve(),
    ])

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
