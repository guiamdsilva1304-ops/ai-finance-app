import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ 
              text: `Generate ONLY an image (no text response). Professional marketing photo for iMoney, a Brazilian fintech app. ${prompt}. Green #00C853 and white modern design, no text in image.`
            }]
          }],
          generationConfig: {
            responseModalities: ["IMAGE"],
          }
        }),
      }
    );

    const data = await response.json();
    
    // Log para debug
    const errorInfo = data?.error || data?.candidates?.[0]?.finishReason || "unknown";
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

    if (imagePart) {
      return NextResponse.json({ 
        imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` 
      });
    }

    return NextResponse.json({ 
      error: `Modelo não gerou imagem. Info: ${JSON.stringify(errorInfo)}` 
    }, { status: 500 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
