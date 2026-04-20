import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLATFORMS: Record<string, { label: string; maxChars: number; imageSize: string }> = {
  instagram: { label: "Instagram",   maxChars: 2200, imageSize: "1:1" },
  tiktok:    { label: "TikTok",      maxChars: 2200, imageSize: "9:16" },
  twitter:   { label: "Twitter / X", maxChars: 280,  imageSize: "16:9" },
  linkedin:  { label: "LinkedIn",    maxChars: 3000, imageSize: "1:1" },
  whatsapp:  { label: "WhatsApp",    maxChars: 1000, imageSize: "1:1" },
};

const AESTHETICS: Record<string, string> = {
  bold: "Bold & Impact — tipografia grande e pesada, verde escuro #1a3a1a e verde vibrante #00C853, ícones ilustrativos de dinheiro/finanças, fundo escuro com elementos gráficos, muito contraste, estilo dos posts atuais da iMoney",
  clean: "Clean & Minimal — fundo branco, tipografia leve e moderna, acentos em verde #00C853, muito espaço negativo, elegante e sofisticado",
  editorial: "Editorial — estilo revista financeira brasileira, grid estruturado, mix de foto e ilustração, cores verde e branco com detalhes dourados",
  gradient: "Gradient & Modern — gradientes de verde escuro para verde vibrante, elementos geométricos, futurista e tecnológico, sem texto",
  ilustrado: "Ilustrado Brasileiro — personagens diversos brasileiros, ilustrações flat coloridas, verde #00C853 dominante, alegre e acessível",
};

function buildPrompt(platform: string, format: string, tone: string, audience: string, theme: string, qty: number, aesthetic: string = "bold") {
  const pl = PLATFORMS[platform];
  return `Você é o melhor estrategista de conteúdo para fintechs do Brasil. Crie ${qty} variação(ões) para a iMoney — app gratuito de finanças pessoais com IA para brasileiros.

BRIEFING:
- Plataforma: ${pl.label} (máximo ${pl.maxChars} caracteres)
- Formato: ${format}
- Tom: ${tone}
- Público: ${audience}
- Tema: ${theme || "finanças pessoais inteligentes"}

ESTÉTICA VISUAL DA iMoney para os prompts de imagem:
${AESTHETICS[aesthetic] || AESTHETICS.bold}

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
      "image_prompt": "prompt em inglês para Pollinations.ai — específico, cores verde #00C853 e branco iMoney, estilo moderno brasileiro, sem texto na imagem",
      "gemini_prompt": "prompt detalhado em português para Gemini/Nano Banana baseado na estética escolhida — descreva composição exata, cores, elementos visuais, tipografia sugerida, mood, ícones. SEM texto dentro da imagem.",      "carousel_slides": [{"slide": 1, "titulo": "texto curto do slide (máx 6 palavras)", "subtitulo": "frase de apoio opcional", "visual_prompt": "prompt visual específico para este slide"}]
    }
  ]
}

REGRAS: português brasileiro autêntico, mencione iMoney organicamente, primeira linha que para o scroll.`;
}


export async function POST(req: NextRequest) {
  try {
    const { platform, format, tone, audience, theme, qty = 1, aesthetic = "bold" } = await req.json();
    const pl = PLATFORMS[platform] || PLATFORMS.instagram;

    // 1. Gerar texto com Claude
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 4000,
      system: "Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.",
      messages: [{ role: "user", content: buildPrompt(platform, format, tone, audience, theme, qty, aesthetic) }],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida do modelo");
    const parsed = JSON.parse(match[0]);
    const variations = parsed.variations || [];

    return NextResponse.json({ variations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
