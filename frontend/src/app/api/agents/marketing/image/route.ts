import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getLogoUrl(supabaseUrl: string) {
  return `${supabaseUrl}/storage/v1/object/public/imoney-media/brand/logo.png`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { postId, visual_description } = body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    await supabase.from("content_pipeline").update({ image_status: "generating" }).eq("id", postId);

    const textContent = visual_description || "CONTROLE SEU DINHEIRO";

    const prompt = `Create a square 1024x1024 Instagram post for iMoney, a Brazilian personal finance app.

BACKGROUND: Pure white #FFFFFF. Clean. No gradients. No textures.

MAIN TEXT: "${textContent}"
- Position: CENTER of the image
- Font: Ultra-bold sans-serif (Impact style)
- Color: Very dark green #1a3a1a
- ALL CAPS
- Size: VERY LARGE, text must fill 55-65% of image width
- IMPORTANT: Show ALL words COMPLETE. Never cut words. Never hyphenate. Reduce font size if needed to show all words.

FLOATING 3D ICONS (placed at corners, not overlapping text):
- Top-left corner: glossy 3D green coin with $ symbol
- Top-right corner: glossy 3D green upward arrow + bar chart growing
- Bottom-left corner: glossy 3D green coin with $ symbol
- Right side middle: glossy 3D green lightbulb

LOGO (bottom-right corner):
- Draw the iMoney logo: a green compass rose with a large dollar sign $ in the center, a fleur-de-lis ornament on top, 4 sharp pointed compass arrows (north, south, east, west), gradient from bright lime green to dark forest green
- Below the compass: text "iMoney" in dark green bold font
- Size: small, about 80-100px, discrete

STYLE: Professional Brazilian fintech. Clean. Minimal. High contrast. No real people. No faces. No English text in main content. Square format only.`;

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
