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
      if (limit.count >= 30) {
        return NextResponse.json({ error: "Limite de 30 mensagens por hora atingido." }, { status: 429 });
      }
      limit.count++;
    } else {
      RATE_LIMIT.set(userId, { count: 1, reset: now + 3600000 });
    }

    const body = await req.json();
    const { messages, context } = body;

    const systemPrompt = `Você é o Assessor Financeiro IA do iMoney, app de finanças pessoais brasileiro.

CONTEXTO DO USUÁRIO:
- Renda mensal: R$ ${context?.renda ?? 0}
- Gastos mensais: R$ ${context?.gastos ?? 0}
- Sobra mensal: R$ ${context?.sobra ?? 0}
- SELIC atual: ${context?.selic ?? 14.75}% a.a.
- IPCA mensal: ${context?.ipca ?? 0.56}%
- Tendência financeira: ${context?.trend ?? "estável"}
- Metas: ${JSON.stringify(context?.metas ?? [])}
- Gastos por categoria: ${JSON.stringify(context?.gastosCat ?? {})}
- Perfil do usuário: ${JSON.stringify(context?.perfilUsuario ?? {})}

INSTRUÇÕES:
- Responda sempre em português brasileiro
- Seja direto, amigável e use linguagem simples
- Use emojis moderadamente
- Forneça exemplos práticos com números quando relevante
- Considere produtos financeiros brasileiros: Tesouro Direto, CDB, LCI/LCA, FIIs, poupança
- Considere impostos brasileiros e regras de IR sobre investimentos
- Mencione SELIC, CDI, IPCA quando relevante
- Se não souber algo específico do usuário, peça mais informações
- Sempre que der conselhos de investimento, mencione que são orientações gerais`;

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
