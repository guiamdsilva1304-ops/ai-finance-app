import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio } = await req.json();

    const aspectMap: Record<string, string> = {
      "1:1": "square",
      "9:16": "portrait_9_16",
      "16:9": "landscape_16_9",
    };

    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${process.env.FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: `Professional marketing image for iMoney, a Brazilian personal finance app. ${prompt}. Modern clean design, green and white colors, no text, high quality social media visual.`,
        image_size: aspectMap[aspectRatio] || "square",
        num_inference_steps: 4,
        num_images: 1,
      }),
    });

    const data = await response.json();
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Imagem não gerada");
    return NextResponse.json({ imageUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
EOFmkdir -p /workspaces/ai-finance-app/frontend/src/app/api/admin/agents/marketing/image && cat > /workspaces/ai-finance-app/frontend/src/app/api/admin/agents/marketing/image/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio } = await req.json();

    const aspectMap: Record<string, string> = {
      "1:1": "square",
      "9:16": "portrait_9_16",
      "16:9": "landscape_16_9",
    };

    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${process.env.FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: `Professional marketing image for iMoney, a Brazilian personal finance app. ${prompt}. Modern clean design, green and white colors, no text, high quality social media visual.`,
        image_size: aspectMap[aspectRatio] || "square",
        num_inference_steps: 4,
        num_images: 1,
      }),
    });

    const data = await response.json();
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Imagem não gerada");
    return NextResponse.json({ imageUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
