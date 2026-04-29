import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Supabase envia webhook quando usuario se cadastra
    if (body.type !== "INSERT" || body.table !== "users") {
      return NextResponse.json({ ok: true });
    }
    
    const email = body.record?.email;
    if (!email) return NextResponse.json({ ok: true });
    
    // Envia email de boas-vindas
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://ai-finance-app-ashen.vercel.app"}/api/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "welcome", to: email }),
    });
    
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
