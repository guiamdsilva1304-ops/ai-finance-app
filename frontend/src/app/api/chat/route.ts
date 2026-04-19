import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const RATE_LIMIT = new Map<string, { count: number; reset: number }>();

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.replace("Bearer ", "") ?? "anonymous";
    const userId = token.slice(0, 20);

    const now = Date.now();
    const limit = RATE_LIMIT.get(userId);
    if (limit && now < limit.reset) {
      if (limit.count >= 30) return NextResponse.json({ error: "Limite de 30 mensagens por hora atingido." }, { status: 429 });
      limit.count++;
    } else {
      RATE_LIMIT.set(userId, { count: 1, reset: now + 3600000 });
    }

    const body = await req.json();
    const { messages, context } = body;

    const systemPrompt = `Você é o Assessor Financeiro do iMoney, um app brasileiro de finanças pessoais. Você é especialista em finanças pessoais brasileiras e fala de forma direta, prática e amigável — como um amigo que entende muito de dinheiro.

PERFIL DO USUÁRIO:
- Idade: ${context?.idade ?? "não informada"}
- Ocupação: ${context?.ocupacao ?? "não informada"}
- Cidade: ${context?.cidade ?? "não informada"} / ${context?.estado ?? ""}
- Filhos: ${context?.filhos ?? 0}
- Renda mensal: R$ ${(context?.renda ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Gastos mensais: R$ ${(context?.gastos ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Sobra mensal: R$ ${(context?.sobra ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Gastos por categoria: ${JSON.stringify(context?.gastosCat ?? {})}
- Metas financeiras: ${JSON.stringify(context?.metas ?? [])}

CENÁRIO ECONÔMICO ATUAL:
- SELIC: ${context?.selic ?? 14.75}% a.a.
- IPCA mensal: ${context?.ipca ?? 0.56}%
- IPCA anual: ${context?.ipca_anual ?? 5.48}%
- Juro real: ${context?.selic && context?.ipca_anual ? ((1 + context.selic/100)/(1 + context.ipca_anual/100) - 1)*100 : 8.79}% a.a.

REGRAS DE RESPOSTA:
1. Seja DIRETO e PRÁTICO — vá logo ao ponto, sem enrolação
2. Use os dados reais do usuário nas respostas (renda, gastos, metas)
3. Dê números concretos sempre que possível (ex: "guarde R$ 450/mês")
4. Use markdown para formatar: **negrito**, ## títulos, listas com -
5. Use emojis com moderação (1-3 por resposta)
6. Respostas completas — nunca corte no meio de uma frase
7. Foque em produtos brasileiros: Tesouro Direto, CDB, LCI/LCA, FIIs, poupança
8. Considere IR, IOF e taxas brasileiras
9. Se o usuário não tem renda/gastos cadastrados, peça que registre no app primeiro
10. Máximo 400 palavras por resposta — seja conciso e útil`;

    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error("Chat error:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
