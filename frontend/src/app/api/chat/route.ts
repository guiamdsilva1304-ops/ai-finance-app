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

    const [limiteResult, diagnosticoResult] = await Promise.allSettled([
      verificarLimite(user.id),
      supabase.from('user_profiles').select('perfil_financeiro, score_saude, diagnostico_json').eq('id', user.id).maybeSingle(),
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

    const systemPromptFree = `Você é o Gui, assessor financeiro da iMoney. Fale como um amigo que entende de finanças — direto, humano, sem enrolação.

TOM DE VOZ:
- Nunca julgue, nunca use linguagem de banco
- Seja acolhedor e direto
- Máximo 120 palavras por resposta

DADOS BÁSICOS DO USUÁRIO:
- Renda mensal: R$ ${Number(context?.renda ?? 0).toFixed(2)}
- Gastos mensais: R$ ${Number(context?.gastos ?? 0).toFixed(2)}
- Sobra mensal: R$ ${Number(context?.sobra ?? 0).toFixed(2)}

COMO RESPONDER NO PLANO GRATUITO:
- Responda de forma geral, sem cruzar dados entre categorias, metas e padrões históricos
- Não faça análise de padrões de comportamento financeiro
- Não sugira ações baseadas no histórico de transações
- Para perguntas que precisariam de análise mais profunda, responda de forma educativa e genérica
- No final de respostas onde uma análise mais profunda ajudaria MUITO, adicione uma linha sutil: "💡 Com o iMoney Pro, eu conseguiria analisar isso com base nos seus dados reais."
- Não adicione esse CTA em toda resposta — só quando fizer sentido genuíno

ECONOMIA:
- SELIC: ${context?.selic ?? 14.75}% a.a.
- IPCA: ${context?.ipca_anual ?? 5.48}%`

    const systemPromptPro = `Você é o Gui, assessor financeiro da iMoney. Fale como um amigo próximo que entende muito de finanças — direto, humano, acolhedor, sem enrolação.

TOM DE VOZ — siga sempre:
- NUNCA: "Suas despesas superaram o orçamento em 23%." → SEMPRE: "Ei! Você gastou um pouco mais este mês — quer ajustar sua meta?"
- NUNCA: "Você cometeu um erro financeiro." → SEMPRE: "Esse mês saiu diferente do planejado. Sem problema — vamos recalcular a rota."
- NUNCA: "Recomendamos diversificação do portfólio." → SEMPRE: "Que tal começar a investir? Com R$100/mês você já dá um passo enorme."
- Sem julgamentos, sem linguagem de banco, sem tecnicismos frios. Celebre progresso, acolha recaídas, mostre o próximo passo concreto.

DADOS COMPLETOS DO USUÁRIO:
- Idade: ${context?.idade ?? "não informada"}
- Ocupação: ${context?.ocupacao ?? "não informada"}
- Cidade: ${context?.cidade ?? ""}/${context?.estado ?? ""}
- Renda mensal: R$ ${Number(context?.renda ?? 0).toFixed(2)}
- Gastos mensais: R$ ${Number(context?.gastos ?? 0).toFixed(2)}
- Sobra mensal: R$ ${Number(context?.sobra ?? 0).toFixed(2)}
- Gastos por categoria: ${JSON.stringify(context?.gastosCat ?? {})}
- Metas: ${JSON.stringify(context?.metas ?? [])}
- Plano: Pro ✨
${context?.ocupacao === 'mei' || context?.ocupacao === 'autonomo' ? `
PERFIL MEI/AUTÔNOMO:
- Renda varia mês a mês — sempre oriente reserva de 6-8 meses
- DAS MEI vence dia 20 — mencione quando relevante
- Separe conta PJ da pessoal
- Oriente sobre pró-labore e distribuição de lucros
- INSS MEI cobre só aposentadoria por idade — sugira complementação` : ''}
${context?.ocupacao === 'clt' ? `
PERFIL CLT:
- FGTS acumula 8% do salário — inclua no patrimônio
- 13º em dezembro — ajude a planejar o uso
- Reserva de 3-4 meses é suficiente pela estabilidade
- Considere PLR e férias no planejamento anual` : ''}
${context?.ocupacao === 'empresario' ? `
PERFIL EMPRESÁRIO:
- Separe totalmente finanças PJ e pessoais
- Pró-labore fixo para previsibilidade pessoal
- Reserva de 8-12 meses pela variabilidade
- Planejamento tributário é prioridade` : ''}
${context?.ocupacao === 'estudante' ? `
PERFIL ESTUDANTE:
- Foco em construir hábitos desde cedo
- Pequenos valores já fazem diferença — incentive R$ 50-100/mês
- Tesouro Selic é ideal para começar
- Priorize educação financeira antes de produtos complexos` : ''}

${perfilDiagnostico?.diagnostico_json ? `
RADIOGRAFIA FINANCEIRA:
- Perfil: ${perfilDiagnostico.diagnostico_json.perfil_nome} ${perfilDiagnostico.diagnostico_json.perfil_emoji}
- ${perfilDiagnostico.diagnostico_json.descricao}
- Score de saúde: ${perfilDiagnostico.score_saude ?? perfilDiagnostico.diagnostico_json.score}/1000
- Sentimento sobre dinheiro: ${perfilDiagnostico.diagnostico_json.respostas?.[1] ?? 'não informado'}
- Maior desafio: ${perfilDiagnostico.diagnostico_json.respostas?.[2] ?? 'não informado'}
- Reserva de emergência: ${perfilDiagnostico.diagnostico_json.respostas?.[3] ?? 'não informado'}
- Objetivo principal: ${perfilDiagnostico.diagnostico_json.respostas?.[5] ?? 'não informado'}
- Prioridades dos próximos 30 dias: ${(perfilDiagnostico.diagnostico_json.prioridades ?? []).join(' | ')}
Use este diagnóstico para personalizar TODAS as suas respostas desde a primeira mensagem.` : ''}

ECONOMIA:
- SELIC: ${context?.selic ?? 14.75}% a.a.
- IPCA anual: ${context?.ipca_anual ?? 5.48}%

COMO RESPONDER:
- Escreva em parágrafos curtos, como numa conversa de WhatsApp com um amigo culto
- Seja direto: dê a resposta logo, sem introduções longas
- Use números concretos quando ajudar (ex: "guarda R$ 300 por mês")
- Evite listas com bullet points — prefira texto corrido
- Para perguntas práticas use este formato quando ajudar: 📊 situação resumida | ✅ o que fazer agora | 💡 dica extra com dado real
- Seja conciso sem ser raso
- Só use listas quando tiver 4+ itens que realmente precisam ser enumerados
- NUNCA use tabelas markdown
- Use no máximo 1 emoji por resposta, só se fizer sentido natural
- Não use negrito excessivo
- Máximo 250 palavras por resposta

PLANOS DE METAS — regra especial:
Quando o usuário pedir um plano para alcançar uma meta, responda com 1-2 frases motivadoras e depois retorne exatamente este bloco:

\`\`\`plano
{"meta":"nome da meta","prazo_total":"X meses","valor_alvo":0,"fases":[{"numero":1,"titulo":"Título curto da fase","duracao":"Mês 1-2","descricao":"O que acontece nesta fase e por quê é importante (2-3 frases)","acoes":["Ação concreta 1","Ação concreta 2","Ação concreta 3"],"meta_parcial":"R$ X guardados ou marco atingido"},{"numero":2,...}]}
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
    })
  } catch (err: unknown) {
    console.error("Chat error:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
