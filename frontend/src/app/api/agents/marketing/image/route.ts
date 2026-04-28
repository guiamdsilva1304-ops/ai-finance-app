import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

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

    const textContent = visual_description || "CONTROLE SEU DINHEIRO";

    // 1. Gera a imagem base SEM logo via gpt-image-1
    const prompt = `Create a square 1024x1024 Instagram post for iMoney Brazilian fintech app.

BACKGROUND: Pure white #FFFFFF. Clean. No gradients. No textures.

MAIN TEXT: "${textContent}"
- Position: CENTER of the image
- Font: Ultra-bold sans-serif (Impact style)
- Color: Very dark green #1a3a1a
- ALL CAPS
- Size: VERY LARGE, filling 55-65% of image width
- IMPORTANT: Show ALL words COMPLETE. Never cut or hyphenate words.
- Leave bottom-right corner area empty (120x120px) for logo placement

FLOATING 3D ICONS at corners (not overlapping text):
- Top-left: glossy 3D green coin with $ symbol
- Top-right: glossy 3D green upward arrow + growing bar chart
- Bottom-left: glossy 3D green coin with $ symbol

STYLE: Professional Brazilian fintech. Clean. Minimal. No real people. No faces. No logo. Square format.`;

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
    if (!b64) throw new Error("Nenhuma imagem gerada");

    const imageBuffer = Buffer.from(b64, "base64");

    // 2. Busca a logo do Supabase Storage
    const logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/imoney-media/brand/logo.png`;
    const logoRes = await fetch(logoUrl);
    let finalBuffer = imageBuffer;

    if (logoRes.ok) {
      const logoBuffer = Buffer.from(await logoRes.arrayBuffer());

      // 3. Redimensiona a logo para 120x120 e compoe no canto inferior direito
      const logoResized = await sharp(logoBuffer)
        .resize(120, 120, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      finalBuffer = await sharp(imageBuffer)
        .composite([{
          input: logoResized,
          gravity: "southeast", // canto inferior direito
          blend: "over",
        }])
        .png()
        .toBuffer();
    }

    // 4. Salva no Supabase Storage
    const fileName = `marketing/${postId}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("imoney-media")
      .upload(fileName, finalBuffer, { contentType: "image/png", upsert: true });

    let finalUrl = "";
    if (!uploadError && uploadData) {
      const { data: pub } = supabase.storage.from("imoney-media").getPublicUrl(fileName);
      finalUrl = pub.publicUrl;
    }

    if (!finalUrl) throw new Error("Erro ao salvar imagem");

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
