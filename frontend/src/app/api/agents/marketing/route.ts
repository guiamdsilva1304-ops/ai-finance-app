import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LUCAS_SYSTEM = `Você é Lucas, CMO da iMoney — fintech brasileira de inteligência financeira pessoal com IA.

CONTEXTO REAL DA EMPRESA:
- Produto: app de finanças pessoais com assessor de IA (Claude Sonnet)
- Diferenciais: IA real integrada a dados financeiros, metas, investimentos, SELIC/IPCA em tempo real
- Público: brasileiros 25-40 anos que querem controlar melhor suas finanças
- Tom: próximo, inteligente, sem juridiquês, empático com a realidade financeira brasileira
- Canal foco: Instagram (Reels e carrosséis)
- Fase: early stage, foco em awareness e primeiros usuários

ESTRATÉGIA DE CONTEÚDO:
- 70% educativo/provocativo (sem mencionar a iMoney diretamente)
- 20% produto (mostrar o assessor IA em ação)
- 10% social proof e bastidores

FORMATOS QUE FUNCIONAM NO INSTAGRAM:
- Reels 15-30s: gancho forte nos primeiros 3 segundos
- Carrossel: 5-7 slides, último slide sempre com CTA
- Single post: dado chocante + explicação curta

ÂNGULOS QUE ENGAJAM SOBRE FINANÇAS:
- "Você sabia que X% dos brasileiros faz isso errado?"
- "O que ninguém te conta sobre [tema financeiro]"
- "Testei [produto/app] por 30 dias e isso aconteceu"
- "Por que sua poupança está te deixando pobre"
- Dados reais do IBGE, SELIC, IPCA, endividamento

Gere APENAS JSON válido, sem markdown, sem explicações fora do JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { dias = 7 } = await req.json().catch(() => ({}));

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: LUCAS_SYSTEM,
      messages: [{
        role: "user",
        content: `Gere ${dias} posts para Instagram da iMoney para os próximos ${dias} dias.
        
Retorne SOMENTE um array JSON com esta estrutura exata para cada post:
[
  {
    "platform": "instagram",
    "content_type": "reels_script|carrossel|single_post",
    "tema": "string curto",
    "angulo": "string descrevendo o ângulo",
    "caption": "caption completo com emojis, máx 200 chars",
    "hashtags": ["array", "de", "hashtags", "sem", "cerquilha"],
    "cta": "call to action específico",
    "melhor_horario": "ex: 18h-20h",
    "visual_description": "descrição detalhada do visual para criar no Canva/CapCut",
    "dias_a_partir_de_hoje": 0
  }
]

Varie os formatos: inclua pelo menos 3 Reels, 2 carrosséis e 2 single posts.
Seja específico e brasileiro. Use dados reais (SELIC, IBGE, endividamento).`
      }]
    });

    const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    
    let posts;
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      posts = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: "Erro ao parsear resposta", raw: text }, { status: 500 });
    }

    // Salva cada post no pipeline
    const inserts = posts.map((post: any) => {
      const date = new Date();
      date.setDate(date.getDate() + (post.dias_a_partir_de_hoje || 0));
      return {
        platform: post.platform || "instagram",
        content_type: post.content_type || "single_post",
        tema: post.tema,
        angulo: post.angulo,
        caption: post.caption,
        hashtags: post.hashtags || [],
        cta: post.cta,
        melhor_horario: post.melhor_horario,
        visual_description: post.visual_description,
        scheduled_for: date.toISOString().split("T")[0],
        status: "aguardando_aprovacao",
      };
    });

    const { data, error } = await supabase.from("content_pipeline").insert(inserts).select();
    
    if (error) throw new Error(error.message);

    // Notifica no canal de agentes
    await supabase.from("agent_messages").insert({
      from_agent: "lucas",
      to_agent: "all",
      message_type: "broadcast",
      subject: `${posts.length} posts gerados para aprovação`,
      body: `Lucas gerou ${posts.length} posts para Instagram. Aguardando aprovação do Gui em /admin/marketing.`,
      priority: "normal",
    });

    return NextResponse.json({ success: true, generated: posts.length, posts: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("content_pipeline")
    .select("*")
    .order("scheduled_for", { ascending: true });
  return NextResponse.json({ posts: data || [] });
}
