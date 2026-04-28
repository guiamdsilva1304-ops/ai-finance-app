import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const dias = body.dias || 3;
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return NextResponse.json({ error: "ANTHROPIC_API_KEY ausente" }, { status: 500 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: "Você é Lucas, CMO da iMoney. Gere posts para Instagram. Retorne SOMENTE JSON válido, sem markdown.",
        messages: [{
          role: "user",
          content: `Gere EXATAMENTE 1 post. Retorne SOMENTE este array JSON sem markdown:
[{"content_type":"reels_script","tema":"tema","angulo":"angulo","caption":"caption emojis max 150 chars","hashtags":["h1","h2","h3"],"cta":"cta","melhor_horario":"18h-20h","visual_description":"descricao visual","dias_a_partir_de_hoje":0}]`
        }]
      })
    });

    const resText = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: `Anthropic ${res.status}: ${resText.slice(0, 200)}` }, { status: 500 });
    }

    const data = JSON.parse(resText);
    const text = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";

    let posts;
    try {
      posts = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (!Array.isArray(posts)) posts = [posts];
    } catch {
      return NextResponse.json({ error: "JSON invalido", raw: text.slice(0, 300) }, { status: 500 });
    }

    const today = new Date();
    const inserts = posts.map((p: any, i: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (p.dias_a_partir_de_hoje || i));
      return {
        platform: "instagram",
        content_type: p.content_type || "single_post",
        tema: p.tema || "Financas",
        angulo: p.angulo || "",
        caption: p.caption || "",
        hashtags: p.hashtags || [],
        cta: p.cta || "",
        melhor_horario: p.melhor_horario || "18h-20h",
        visual_description: p.visual_description || "",
        scheduled_for: d.toISOString().split("T")[0],
        status: "aguardando_aprovacao",
        image_status: "pending",
      };
    });

    const { data: saved, error } = await supabase.from("content_pipeline").insert(inserts).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, generated: inserts.length, posts: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
