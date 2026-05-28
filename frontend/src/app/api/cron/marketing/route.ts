// /app/api/cron/marketing/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutos (agentes demoram ~30-60s)

export async function GET(req: NextRequest) {
  // Vercel Cron autentica via CRON_SECRET no header
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron Marketing] Disparando time de marketing...");

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-finance-app-ashen.vercel.app";

    const response = await fetch(`${baseUrl}/api/agents/marketing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": process.env.CRON_SECRET!,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Cron Marketing] Erro no pipeline:", data);
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    console.log(`[Cron Marketing] Sucesso! Tema: ${data.tema_do_dia}`);

    return NextResponse.json({
      success: true,
      message: `Time de marketing executou com sucesso`,
      tema: data.tema_do_dia,
      pilar: data.pilar,
      posts_gerados: data.posts_gerados,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron Marketing] Erro:", error);
    return NextResponse.json({ error: "Falha ao acionar o pipeline" }, { status: 500 });
  }
}
