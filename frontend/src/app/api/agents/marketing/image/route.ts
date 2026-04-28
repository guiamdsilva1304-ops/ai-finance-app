import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { postId, visual_description } = body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    await supabase.from("content_pipeline").update({ image_status: "generating" }).eq("id", postId);

    const prompt = `Instagram post for iMoney Brazilian fintech app. EXACT MANDATORY STYLE:

BACKGROUND: Pure white #FFFFFF. Clean, minimal, no gradients, no textures.

MAIN TEXT: Portuguese text displayed in CENTER of image. Font: ultra-bold black sans-serif (like Impact or Anton). Color: very dark green #1a3a1a. Size: GIANT, text must be COMPLETE without cuts or line breaks in wrong places - show full words. ALL CAPS. Text occupies 55-65% of the image. Text: "${visual_description || "CONTROLE SEU DINHEIRO"}".

FLOATING 3D ICONS: Around the text at corners and edges - green glossy 3D rendered objects: gold-green coin with dollar sign, upward green arrow, green growing bar chart, green lightbulb. Modern shiny style.

LOGO: Bottom-right corner only. Small logo: green compass/clock icon circle with dollar sign inside, text "iMoney" to the right in dark green. Discrete, small.

CRITICAL: Show ALL words of the text completely. Do not cut words. Do not use hyphenation.
NO real people. NO faces. NO English words in main text. Square 1:1 format.`;

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "OpenAI error " + res.status);
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    const url = data.data?.[0]?.url;

    let finalUrl = url || "";

    if (b64) {
      const buffer = Buffer.from(b64, "base64");
      const fileName = `marketing/${postId}-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("imoney-media")
        .upload(fileName, buffer, { contentType: "image/png", upsert: true });

      if (!uploadError && uploadData) {
        const { data: pub } = supabase.storage.from("imoney-media").getPublicUrl(fileName);
        finalUrl = pub.publicUrl;
      } else {
        finalUrl = "data:image/png;base64," + b64;
      }
    }

    if (!finalUrl) throw new Error("Nenhuma imagem gerada");

    await supabase.from("content_pipeline").update({
      image_url: finalUrl,
      image_status: "ready",
    }).eq("id", postId);

    return NextResponse.json({ success: true, image_url: finalUrl });

  } catch (err: any) {
    console.error("Image error:", err.message);
    await supabase.from("content_pipeline").update({ image_status: "failed" }).eq("id", postId);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
