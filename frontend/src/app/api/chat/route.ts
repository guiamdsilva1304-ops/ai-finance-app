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

    const systemPrompt = `Você é o assessor financeiro do iMoney. Fale como um amigo que entende muito de finanças — direto, humano, sem enrolação.

DADOS DO USUÁRIO:
- Idade: ${context?.idade ?? "não informada"}
- Ocupação: ${context?.ocupacao ?? "não informada"}
- Cidade: ${context?.cidade ?? ""}/${context?.estado ?? ""}
- Renda mensal: R$ ${Number(context?.renda ?? 0).toFixed(2)}
- Gastos mensais: R$ ${Number(context?.gastos ?? 0).toFixed(2)}
- Sobra mensal: R$ ${Number(context?.sobra ?? 0).toFixed(2)}
- Gastos por categoria: ${JSON.stringify(context?.gastosCat ?? {})}
- Metas: ${JSON.stringify(context?.metas ?? [])}

ECONOMIA:
- SELIC: ${context?.selic ?? 14.75}% a.a.
- IPCA anual: ${context?.ipca_anual ?? 5.48}%

COMO RESPONDER:
- Escreva em parágrafos curtos, como numa conversa de WhatsApp com um amigo culto
- Seja direto: dê a resposta logo, sem introduções longas
- Use números concretos quando ajudar (ex: "guarda R$ 300 por mês")
- Evite listas com bullet points — prefira texto corrido
- Só use listas quando tiver 4+ itens que realmente precisam ser enumerados
- NUNCA use tabelas markdown
- Use no máximo 1 emoji por resposta, só se fizer sentido natural
- Não use negrito excessivo — só para destacar um número ou termo técnico importante
- Máximo 250 palavras por resposta
- Se não souber algo do usuário, pergunte de forma simples antes de responder`;

    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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
