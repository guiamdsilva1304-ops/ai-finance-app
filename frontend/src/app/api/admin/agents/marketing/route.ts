import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(platform: string, format: string, tone: string, audience: string, theme: string, qty: number) {
  return `Você é o melhor estrategista de conteúdo para fintechs do Brasil. Crie ${qty} variação(ões) de conteúdo para a iMoney — app gratuito de finanças pessoais com IA para brasileiros.

BRIEFING:
- Plataforma: ${platform}
- Formato: ${format}
- Tom: ${tone}
- Público: ${audience}
- Tema: ${theme || "finanças pessoais inteligentes"}

RETORNE SOMENTE este JSON (zero markdown):
{
  "variations": [
    {
      "post": "texto completo pronto pra copiar, emojis, quebras com \\n",
      "hashtags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
      "cta": "chamada para ação poderosa",
      "melhor_horario": "dia(s) e horário ideal",
      "gancho": "primeira linha alternativa mais forte",
      "insight": "por que este conteúdo vai performar",
      "formato_visual": "sugestão de imagem ou vídeo"
    }
  ]
}

REGRAS: português brasileiro autêntico, mencione iMoney organicamente, primeira linha que para o scroll.`;
}

export async function POST(req: NextRequest) {
  try {
    const { platform, format, tone, audience, theme, qty = 1 } = await req.json();
    const message = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 4000,
      system: "Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.",
      messages: [{ role: "user", content: buildPrompt(platform, format, tone, audience, theme, qty) }],
    });
    const raw = message.content.filter((b) => b.type === "text").map((b: any) => b.text).join("").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida");
    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
