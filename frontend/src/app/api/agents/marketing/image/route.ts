import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMONEY_STYLE = `
ESTILO VISUAL OBRIGATÓRIO — iMoney Brasil:
- FUNDO: branco puro #FFFFFF — limpo, sem gradiente
- TIPOGRAFIA: texto principal em português, fonte ultra bold sem serifa, cor verde escuro #1a3a1a, tamanho gigante ocupando 50-65% da imagem, todas as letras maiúsculas
- ÍCONES 3D: elementos financeiros flutuando ao redor do texto — moedas douradas/verdes com símbolo $, seta para cima verde, gráfico de barras crescente verde, lâmpada verde — estilo 3D render moderno, brilhante
- LOGO: no canto inferior direito, logo da iMoney (bússola verde com cifrão $ no centro e texto "iMoney" abaixo) — pequeno e discreto
- SEM pessoas reais, sem rostos, sem texto em inglês
- Proporção quadrada 1:1 para feed do Instagram
- Visual impactante que para o scroll — igual ao estilo do app iMoney
- Exemplo de referência: fundo branco, texto "NÃO É SOBRE GANHAR MAIS. É SOBRE CONTROLAR MELHOR." em verde escuro bold gigante, moedas 3D verdes flutuando nos cantos, logo iMoney no canto inferior direito
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
