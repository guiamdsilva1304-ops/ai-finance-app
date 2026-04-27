import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMONEY_STYLE = `
Estilo visual obrigatório:
- Design minimalista e moderno, estilo fintech brasileira premium
- Paleta: fundo escuro (#0f172a ou #1e293b) OU fundo verde escuro (#14532d)
- Texto em branco ou verde claro (#86efac)
- Tipografia bold, clean, sem serifa
- Sem pessoas reais, sem rostos
- Pode ter ícones geométricos, gráficos abstratos, símbolos financeiros
- Proporção quadrada 1:1 para feed do Instagram
- Sem texto em inglês — tudo em português
- Logo ou marca d'água sutil no canto inferior
- Visual que para o scroll — impactante e direto
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
        model: "dall-e-3",
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
