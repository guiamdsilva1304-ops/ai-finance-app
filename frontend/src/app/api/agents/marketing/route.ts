import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AESTHETICS: Record<string, string> = {
  bold: `Estética EXATA da iMoney — Bold & Impact:
TIPOGRAFIA: palavras-chave em fonte ultra bold, verde escuro #1a3a1a, tamanho gigante ocupando 60-70% da imagem
NÚMEROS/DADOS: destaque numérico enorme em verde vibrante #00C853 com ícones financeiros incorporados
ÍCONES: ilustrações flat de finanças (carteira, moedas, gráficos, setas, cartão, cofre, cifrão) em verde
FUNDO: branco puro #FFFFFF ou gradiente suave verde clarissimo #e8f5e9 para branco
LOGO: "iMoney" com ícone bússola/cifrão no canto inferior direito
ESTILO: flat design brasileiro moderno, clean, linhas nítidas, sem sombras pesadas`,
  clean: `Estética Clean iMoney: fundo branco puro, tipografia bold verde escuro #1a3a1a, 1-2 ícones minimalistas em verde #00C853, muito espaço negativo, logo iMoney discreto no canto inferior direito`,
  editorial: `Estética Editorial iMoney: fundo gradiente verde escuro #0d2b0d para verde médio, tipografia branca impactante, ícones dourados e brancos premium, logo iMoney em branco no canto inferior direito`,
  gradient: `Estética Gradient iMoney: fundo gradiente verde escuro #0a2e0a para verde vibrante #00C853, formas geométricas translúcidas, tipografia branca bold, ícones brancos semi-transparentes, logo iMoney em branco`,
  ilustrado: `Estética Ilustrada iMoney: personagem brasileiro jovem e diverso estilo flat illustration, verde #00C853 dominante, ícones flutuando (moedas, gráficos, celular com app), fundo verde claro ou branco, logo iMoney no canto`,
};

function buildPrompt(briefing: string, platform: string, format: string, tone: string, aesthetic: string, qty: number) {
  const aestheticDesc = AESTHETICS[aesthetic] || AESTHETICS.bold;

  return `Você é o melhor estrategista de marketing de conteúdo para fintechs brasileiras, com profundo conhecimento do mercado brasileiro, comportamento do consumidor e algoritmos de redes sociais.

BRIEFING DO CLIENTE:
"${briefing}"

CONFIGURAÇÕES (se "auto", você decide o melhor):
- Plataforma: ${platform === "auto" ? "VOCÊ DECIDE a melhor para este conteúdo" : platform}
- Formato: ${format === "auto" ? "VOCÊ DECIDE o melhor formato" : format}
- Tom de voz: ${tone === "auto" ? "VOCÊ DECIDE o tom ideal" : tone}
- Variações: ${qty}

SOBRE A iMoney:
App gratuito de finanças pessoais com IA para brasileiros. Categoriza gastos automaticamente via Open Finance, tem assessor financeiro por IA, metas inteligentes. Interface verde e branca, jovem e acessível.

ESTÉTICA VISUAL:
${aestheticDesc}

RETORNE SOMENTE este JSON válido (zero markdown):
{
  "variations": [
    {
      "analise": "por que estas escolhas estratégicas são as melhores para este briefing específico — seja detalhado",
      "plataforma_recomendada": "plataforma ideal e por quê",
      "formato_recomendado": "formato ideal e por quê",
      "tom_recomendado": "tom de voz ideal e por quê",
      "publico_recomendado": "público-alvo específico e por quê",
      "melhor_horario": "dia(s) e horário com justificativa",
      "post": "texto completo pronto para publicar, com emojis estratégicos e quebras de linha com \\n",
      "hashtags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
      "cta": "chamada para ação específica e poderosa",
      "gancho": "versão alternativa da primeira linha ainda mais impactante",
      "insight": "análise de por que este conteúdo vai performar bem algoritimicamente",
      "gemini_prompt": "prompt ULTRA detalhado em português para Gemini Nano Banana gerar imagem no estilo iMoney. Inclua: (1) ELEMENTO CENTRAL: descreva o elemento principal gigante; (2) ÍCONES: liste 4-5 ícones financeiros específicos; (3) TIPOGRAFIA: palavras-chave em bold gigante e onde ficam; (4) PALETA: cores exatas hex; (5) COMPOSIÇÃO: onde cada elemento fica; (6) ESTILO: flat design brasileiro; (7) RESTRIÇÕES: apenas logo iMoney como texto, sem outros textos, formato quadrado 1:1",
      "carousel_slides": [
        {
          "slide": 1,
          "titulo": "texto curto impactante (máx 5 palavras)",
          "subtitulo": "frase de apoio opcional",
          "visual_prompt": "prompt visual detalhado para este slide específico no estilo iMoney"
        }
      ]
    }
  ]
}

REGRAS OBRIGATÓRIAS:
1. O post deve ser EXTRAORDINÁRIO — o melhor conteúdo possível para este briefing
2. Use dados reais e atuais do Brasil (IBGE, Banco Central, Serasa, CNDL)
3. Mencione iMoney de forma 100% orgânica, nunca como propaganda
4. Português brasileiro autêntico — como seu amigo mais inteligente falaria
5. Primeira linha DEVE parar o scroll em menos de 1 segundo
6. Carrossel só se fizer sentido para o conteúdo — senão retorne array vazio
7. Cada variação deve ter abordagem genuinamente diferente`;
}

export async function POST(req: NextRequest) {
  try {
    const { briefing, platform = "auto", format = "auto", tone = "auto", aesthetic = "bold", qty = 1 } = await req.json();

    if (!briefing?.trim()) throw new Error("Briefing é obrigatório");

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 6000,
      system: "Você é um especialista em marketing de conteúdo. Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.",
      messages: [{ role: "user", content: buildPrompt(briefing, platform, format, tone, aesthetic, qty) }],
    });

    const raw = message.content.filter((b) => b.type === "text").map((b: any) => b.text).join("").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida do modelo");
    const parsed = JSON.parse(match[0]);
    const variations = parsed.variations || [];
    if (!variations.length || !variations[0].post) throw new Error("Sem conteúdo gerado");

    // Gerar imagem via Pollinations diretamente
    const variationsWithImages = variations.map((v: any) => {
      const prompt = encodeURIComponent(
        `Professional marketing image for iMoney Brazilian fintech. ${v.gemini_prompt || briefing}. Green #00C853 white modern flat design no text high quality.`
      );
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random()*99999)}`;
      return { ...v, imageUrl };
    });

    return NextResponse.json({ variations: variationsWithImages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
