import { NextRequest, NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const FROM_EMAIL = "Gui da iMoney <gui@imoney.ia.br>";

export async function POST(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  let body: { to?: string; subject?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { to, subject, text } = body;
  if (!to || !subject || !text) {
    return NextResponse.json({ error: "to, subject e text são obrigatórios" }, { status: 400 });
  }

  const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px;color:#0f172a;font-size:15px;line-height:1.7;">${text.replace(/\n/g, "<br>")}</div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data?.message ?? "Erro no Resend" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
