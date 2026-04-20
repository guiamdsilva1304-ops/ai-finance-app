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

function buildPrompt(platform: string, format: string, tone: string, audience: string, theme: string, qty: number) {
  const pl = PLATFORMS[platform];
  return `Você é o melhor estrategista de conteúdo para fintechs do Brasil. Crie ${qty} variação(ões) para a iMoney — app gratuito de finanças pessoais com IA para brasileiros.

BRIEFING:
- Plataforma: ${pl.label} (máximo ${pl.maxChars} caracteres)
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
      "image_prompt": "prompt em inglês para gerar imagem que acompanha este post — seja específico, descreva cores verde e branco da iMoney, estilo moderno e brasileiro, sem texto na imagem"
    }
  ]
}

REGRAS: português brasileiro autêntico, mencione iMoney organicamente, primeira linha que para o scroll.`;
}

async function generateImage(prompt: string, aspectRatio: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a professional marketing image for iMoney, a Brazilian personal finance app. ${prompt}. Style: modern, clean, green (#00C853) and white color scheme, no text overlay, suitable for ${aspectRatio} social media post, high quality.`
            }]
          }],
          generationConfig: {
            responseModalities: ["IMAGE"],
          }
        }),
      }
    );

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
    if (imagePart) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { platform, format, tone, audience, theme, qty = 1 } = await req.json();
    const pl = PLATFORMS[platform] || PLATFORMS.instagram;

    // 1. Gerar texto com Claude
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 4000,
      system: "Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.",
      messages: [{ role: "user", content: buildPrompt(platform, format, tone, audience, theme, qty) }],
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

    // 2. Gerar imagens em paralelo
    const variationsWithImages = await Promise.all(
      variations.map(async (v: any) => {
        const imageUrl = await generateImage(v.image_prompt || theme, pl.imageSize);
        return { ...v, imageUrl };
      })
    );

    return NextResponse.json({ variations: variationsWithImages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
