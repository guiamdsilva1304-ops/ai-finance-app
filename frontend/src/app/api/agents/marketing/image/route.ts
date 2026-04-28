import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMONEY_STYLE = `
Instagram post for iMoney Brazilian fintech app. MANDATORY STYLE:

BACKGROUND: Pure white background only. No gradients. No dark colors.

TEXT: Main message in Portuguese in the CENTER of image. Ultra-bold sans-serif font. Dark green color #1a3a1a. ALL CAPS. Giant size, 50-65% of image area. This text must be the hero element.

FLOATING ELEMENTS: Around the text edges, floating modern glossy rendered icons: green coins with dollar sign, upward green arrow, green growing bar chart, green lightbulb. Scattered naturally at corners and sides.

LOGO: Small iMoney logo at bottom-right corner only: green compass icon with dollar sign in center, text "iMoney" below it.

NO dark backgrounds. NO people. NO faces. NO English text. Square format.

REFERENCE STYLE: Like a Brazilian fintech social post with white background, giant dark green bold text center, green glossy financial icons floating around edges, small brand logo bottom-right.
`;
export async function POST(req: NextRequest) {
  try {
    const { postId, visual_description, tema } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Marca como gerando
    await supabase.from("content_pipeline")
      .update({ image_status: "generating" })
      .eq("id", postId);

    // Cria o prompt otimizado para DALL-E 3
    const imagePrompt = `Instagram post for Brazilian fintech app iMoney. ${visual_description}. ${IMONEY_STYLE}. No watermarks from other brands. High quality, professional social media design.`;

    // Chama DALL-E 3
    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      }),
    });

    if (!dalleRes.ok) {
      const err = await dalleRes.json();
      throw new Error(err.error?.message || "DALL-E error");
    }

    const dalleData = await dalleRes.json();
    const imageUrl = dalleData.data?.[0]?.url;

    if (!imageUrl) throw new Error("Nenhuma imagem gerada");

    // Baixa a imagem e salva no Supabase Storage
    const imgRes = await fetch(imageUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    const fileName = `marketing/${postId}-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("imoney-media")
      .upload(fileName, imgBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    let finalUrl = imageUrl; // fallback para URL temporária do DALL-E

    if (!uploadError && uploadData) {
      const { data: publicUrl } = supabase.storage
        .from("imoney-media")
        .getPublicUrl(fileName);
      finalUrl = publicUrl.publicUrl;
    }

    // Atualiza o post com a imagem
    await supabase.from("content_pipeline").update({
      image_url: finalUrl,
      image_prompt: imagePrompt,
      image_status: "ready",
    }).eq("id", postId);

    return NextResponse.json({ success: true, image_url: finalUrl });
  } catch (err: any) {
    console.error("Image generation error:", err.message);

    // Marca como falhou
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { postId } = await req.json().catch(() => ({}));
    if (postId) {
      await supabase.from("content_pipeline")
        .update({ image_status: "failed" })
        .eq("id", postId);
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
