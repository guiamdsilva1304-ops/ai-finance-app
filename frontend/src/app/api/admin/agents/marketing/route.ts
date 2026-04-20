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
  bold: `Estética EXATA da iMoney — siga rigorosamente:
TIPOGRAFIA: palavras-chave em fonte ultra bold (Black/Heavy), verde escuro #1a3a1a, tamanho gigante ocupando 60-70% da imagem
NÚMEROS/DADOS: destaque numérico enorme (ex: "3", "10%", "R$500") em verde vibrante #00C853 com ícones financeiros incorporados dentro ou ao redor do número
ÍCONES: ilustrações flat de finanças (carteira, moedas, gráficos, setas, cartão, cofre, cifrão) em verde #00C853 e verde escuro, espalhados estrategicamente
FUNDO: branco puro #FFFFFF ou gradiente suave de verde clarissimo #e8f5e9 para branco
LOGO: "iMoney" com ícone de bússola/cifrão no canto inferior direito, pequeno e elegante
COMPOSIÇÃO: elemento central grande (número ou ícone), texto em baixo, logo no rodapé
ESTILO: flat design brasileiro moderno, clean, sem sombras pesadas, linhas nítidas
SEM TEXTO além do logo iMoney`,
  clean: `Estética Clean iMoney:
FUNDO: branco puro com gradiente verde clarissimo nas bordas
TIPOGRAFIA: bold mas mais leve, verde escuro #1a3a1a
ÍCONES: apenas 1-2 ícones minimalistas em verde #00C853
COMPOSIÇÃO: muito espaço negativo, elemento central isolado
LOGO: iMoney discreto no canto inferior direito
ESTILO: minimalista, sofisticado, respirado`,
  editorial: `Estética Editorial iMoney:
FUNDO: gradiente verde escuro #0d2b0d para verde médio #1a5c1a
TIPOGRAFIA: branca e impactante sobre o fundo escuro
ÍCONES: dourados e brancos, estilo premium
COMPOSIÇÃO: grid estruturado, hierarquia clara
LOGO: iMoney em branco, canto inferior direito
ESTILO: revista financeira premium brasileira`,
  gradient: `Estética Gradient iMoney:
FUNDO: gradiente de verde escuro #0a2e0a para verde vibrante #00C853
ELEMENTOS: formas geométricas translúcidas, círculos e linhas em verde claro
TIPOGRAFIA: branca bold sobre gradiente
ÍCONES: brancos e semi-transparentes
LOGO: iMoney em branco, canto inferior direito
ESTILO: fintech moderno, tecnológico, futurista`,
  ilustrado: `Estética Ilustrada iMoney:
PERSONAGEM: brasileiro(a) jovem e diverso, estilo flat illustration, sorrindo
CORES: verde #00C853 dominante, detalhes amarelos e brancos
ÍCONES: flutuando ao redor do personagem (moedas, gráficos, celular com app)
FUNDO: verde claro ou branco com elementos gráficos
LOGO: iMoney no canto inferior direito
ESTILO: alegre, acessível, flat design brasileiro`,
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
      "gemini_prompt": "Crie uma imagem no estilo EXATO da iMoney seguindo a estética configurada. O prompt deve ter: (1) ELEMENTO CENTRAL: descreva o elemento principal que ocupa a maior parte da imagem — pode ser um número grande, um ícone gigante ou uma ilustração central; (2) ÍCONES FINANCEIROS: liste 3-5 ícones específicos de finanças para incluir (ex: carteira digital, moedas empilhadas, gráfico crescente, cartão de crédito, cofre, cifrão, bússola); (3) TIPOGRAFIA VISUAL: descreva as palavras-chave que aparecerão em bold gigante e onde ficam na composição; (4) PALETA EXATA: verde escuro #1a3a1a para texto, verde vibrante #00C853 para ícones e destaques, fundo branco ou gradiente verde clarissimo; (5) COMPOSIÇÃO: elemento central no topo/meio, texto em baixo, logo iMoney (ícone bússola + texto) no canto inferior direito; (6) ESTILO: flat design brasileiro moderno, linhas nítidas, sem sombras pesadas, alta qualidade; (7) RESTRIÇÕES: apenas o logo iMoney como texto, sem outros textos na imagem, formato quadrado 1:1.",      "carousel_slides": [{"slide": 1, "titulo": "texto curto do slide (máx 6 palavras)", "subtitulo": "frase de apoio opcional", "visual_prompt": "prompt visual específico para este slide"}]
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
