import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildEmailHTML(subject: string, body: string): string {
  const bodyHtml = body.split("\n").filter(Boolean).map(p =>
    p === "---" ? '<hr style="border:none;border-top:1px solid #e4f5e9;margin:24px 0"/>' :
    `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.8">${p}</p>`
  ).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#f0fdf4;font-family:Nunito,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:28px 32px;text-align:center">
<span style="color:#ffffff;font-size:26px;font-weight:900">💚 iMoney · Marketing</span>
<p style="color:#dcfce7;font-size:13px;margin:4px 0 0;font-weight:600">Seus prompts de conteúdo de hoje</p>
</td></tr>
<tr><td style="padding:36px 32px">
<h1 style="color:#14532d;font-size:20px;font-weight:800;margin:0 0 20px">${subject}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0fdf4;text-align:center">
<p style="color:#9ca3af;font-size:12px;margin:0">iMoney · Prompts automáticos de marketing</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.imoneycronsecret2026}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const dayNames = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
    const dayName = dayNames[today.getDay()];
    const dateStr = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const themes = [
      "SELIC alta e como aproveitar para investir melhor",
      "Como sair das dívidas com planejamento financeiro",
      "Reserva de emergência: por que e como montar",
      "Diferença entre CDB, Tesouro Direto e poupança",
      "Como definir metas financeiras e cumpri-las",
      "Gastos invisíveis que estão acabando com seu dinheiro",
      "Investir com pouco dinheiro é possível",
      "IPCA e inflação: o que significa pro seu bolso",
      "Como o iMoney pode transformar sua vida financeira",
      "Educação financeira para iniciantes",
    ];
    const theme = themes[today.getDay() % themes.length];

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: "Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.",
      messages: [{
        role: "user",
        content: `Você é especialista em marketing de finanças pessoais para Instagram brasileiro.
Crie 2 prompts detalhados para criação de conteúdo no Instagram sobre o tema: "${theme}".
Conecte ao iMoney (app gratuito de finanças pessoais com IA em https://ai-finance-app-ashen.vercel.app).

PROMPT 1: POST (imagem estática ou carrossel)
PROMPT 2: REEL (vídeo curto 15-30s)

Cada prompt deve ter:
- Ideia criativa do conteúdo
- Roteiro ou descrição visual detalhada
- Legenda completa com emojis e hashtags (#iMoney #financaspessoais #educacaofinanceira etc)
- CTA para baixar o iMoney gratuitamente

Hoje é ${dayName}, ${dateStr}. Tom: jovem, brasileiro, educativo e descontraído.

Retorne JSON: {"subject":"📱 Prompts de hoje: [tema resumido]","body":"PROMPT 1 — POST\\n[conteúdo completo]\\n\\n---\\n\\nPROMPT 2 — REEL\\n[conteúdo completo]"}`
      }],
    });

    const raw = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida da IA");
    const { subject, body } = JSON.parse(match[0]);

    await resend.emails.send({
      from: "iMoney Marketing <onboarding@resend.dev>",
      to: "guiamdsilva1304@gmail.com",
      subject,
      html: buildEmailHTML(subject, body),
      text: body,
    });

    return NextResponse.json({ ok: true, sent: true, theme });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
