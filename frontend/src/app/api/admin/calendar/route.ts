import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
);

export async function POST(req: NextRequest) {
  try {
    const { month, year, platform, audience, aesthetic } = await req.json();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: "Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.",
      messages: [{
        role: "user",
        content: `Você é o melhor estrategista de conteúdo para fintechs brasileiras. Crie um calendário editorial completo de 30 dias para a iMoney no mês ${month}/${year}.

Plataforma: ${platform}
Público principal: ${audience}
Estética: ${aesthetic}

Distribua os posts estrategicamente considerando:
- Dias da semana com melhor engajamento
- Variedade de formatos e temas
- Datas comemorativas e eventos financeiros do Brasil em ${month}/${year}
- Mix de conteúdo educacional, engajamento e conversão

RETORNE SOMENTE este JSON:
{
  "month": ${month},
  "year": ${year},
  "posts": [
    {
      "day": 1,
      "weekday": "Segunda",
      "format": "Post Educacional",
      "theme": "tema específico",
      "tone": "amigavel",
      "hook": "primeira linha impactante pronta para usar",
      "post": "post completo pronto para publicar com emojis e quebras de linha",
      "hashtags": ["tag1","tag2","tag3","tag4","tag5"],
      "melhor_horario": "19h",
      "gemini_prompt": "prompt ultra detalhado para gerar imagem no Gemini",
      "tipo": "educacional"
    }
  ]
}`
      }]
    });

    const raw = message.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("").trim();
    const first = raw.indexOf('{'), last = raw.lastIndexOf('}');
    if (first === -1) throw new Error("Resposta inválida da IA");
    const parsed = JSON.parse(raw.slice(first, last + 1)) as { posts: Array<{ format: string; tone: string; theme: string; post: string; hashtags: string[]; melhor_horario: string; hook: string; gemini_prompt: string }> };

    // Salva todos os posts no Supabase
    const postsToInsert = parsed.posts.map((p) => ({
      platform,
      audience,
      aesthetic,
      format: p.format,
      tone: p.tone,
      theme: p.theme,
      post: p.post,
      hashtags: p.hashtags,
      melhor_horario: p.melhor_horario,
      gancho: p.hook,
      gemini_prompt: p.gemini_prompt,
      used: false,
      rating: 0,
    }));

    await supabase.from("admin_posts").insert(postsToInsert);

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
