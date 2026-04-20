import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a professional social media marketing image for iMoney, a Brazilian personal finance app. ${prompt}. Style: modern, clean, green (#00C853) and white color scheme, no text in the image, high quality.`
            }]
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          }
        }),
      }
    );

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
    
    if (imagePart) {
      const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      return NextResponse.json({ imageUrl });
    }

    throw new Error("Imagem não gerada: " + JSON.stringify(data).slice(0, 200));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
