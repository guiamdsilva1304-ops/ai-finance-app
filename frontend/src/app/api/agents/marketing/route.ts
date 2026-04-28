import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LUCAS_PROMPT = `Você é Lucas, CMO da iMoney — fintech brasileira de inteligência financeira pessoal com IA.

Público: brasileiros 25-40 anos que querem controlar melhor suas finanças.
Tom: direto, provocativo, baseado em dados reais brasileiros (SELIC, IBGE, endividamento).
Canal: Instagram (Reels e carrosséis).

Gere SOMENTE um array JSON válido, sem markdown, sem texto fora do JSON.`;

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from("content_pipeline")
      .select("*")
      .order("scheduled_for", { ascending: true });
    return NextResponse.json({ posts: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dias = body.dias || 7;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: LUCAS_PROMPT,
      messages: [{
        role: "user",
        content: `Gere ${dias} posts para Instagram da iMoney para os próximos ${dias} dias.

Retorne SOMENTE este array JSON (sem explicações):
[
  {
    "content_type": "reels_script|carrossel|single_post",
    "tema": "tema curto",
    "angulo": "ângulo do post",
    "caption": "caption com emojis até 200 chars",
    "hashtags": ["hashtag1", "hashtag2"],
    "cta": "call to action",
    "melhor_horario": "18h-20h",
    "visual_description": "descrição detalhada do visual para Canva/CapCut",
    "dias_a_partir_de_hoje": 0
  }
]

Inclua 3 Reels, 2 carrosséis e 2 single posts. Use dados reais do Brasil.`
      }]
    });

    const text = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    let posts;
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      posts = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: "Erro ao parsear JSON", raw: text.slice(0, 500) }, { status: 500 });
    }

    const today = new Date();
    const inserts = posts.map((post: any) => {
      const date = new Date(today);
      date.setDate(date.getDate() + (post.dias_a_partir_de_hoje || 0));
      return {
        platform: "instagram",
        content_type: post.content_type || "single_post",
        tema: post.tema || "Finanças",
        angulo: post.angulo || "",
        caption: post.caption || "",
        hashtags: post.hashtags || [],
        cta: post.cta || "",
        melhor_horario: post.melhor_horario || "18h-20h",
        visual_description: post.visual_description || "",
        scheduled_for: date.toISOString().split("T")[0],
        status: "aguardando_aprovacao",
        image_status: "pending",
      };
    });

    const { data, error } = await supabase
      .from("content_pipeline")
      .insert(inserts)
      .select();

    if (error) throw new Error(error.message);

    await supabase.from("agent_messages").insert({
      from_agent: "lucas",
      to_agent: "all",
      message_type: "broadcast",
      subject: `${posts.length} posts gerados para aprovação`,
      body: `Lucas gerou ${posts.length} posts para Instagram. Aguardando aprovação em /admin/marketing.`,
      priority: "normal",
    });

    return NextResponse.json({ success: true, generated: posts.length, posts: data });
  } catch (err: any) {
    console.error("Marketing route error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
