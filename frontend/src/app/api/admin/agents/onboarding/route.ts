import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

function buildEmailHTML(subject: string, plain: string): string {
  const bodyHtml = plain.split("\n").join("<br>");
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8">',
    '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet">',
    '</head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Nunito,sans-serif">',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0">',
    '<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08)">',
    '<tr><td style="background:#00C853;padding:24px 32px;text-align:center">',
    '<span style="font-size:28px">&#x1F4B8;</span>',
    '<span style="color:#ffffff;font-size:22px;font-weight:900;margin-left:8px">iMoney</span>',
    '</td></tr>',
    '<tr><td style="padding:32px">',
    '<h1 style="color:#1a3a1a;font-size:22px;font-weight:800;margin:0 0 16px">' + subject + '</h1>',
    '<div style="color:#333;font-size:15px;line-height:1.7">' + bodyHtml + '</div>',
    '<div style="margin:28px 0;text-align:center">',
    '<a href="https://ai-finance-app-ashen.vercel.app" style="background:#00C853;color:#000;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:15px;display:inline-block">',
    'Abrir iMoney &#x2192;</a></div>',
    '</td></tr>',
    '<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0;text-align:center">',
    '<p style="color:#999;font-size:12px;margin:0">Voce recebe este email pois se cadastrou na iMoney.<br>',
    '<a href="#" style="color:#00C853">Descadastrar</a></p>',
    '</td></tr></table></td></tr></table></body></html>',
  ].join("");
}

function buildPrompt(userName: string, userEmail: string, context: string): string {
  return `Você é especialista em onboarding de fintechs brasileiras. Crie sequência de 7 emails para iMoney (app gratuito de finanças pessoais com IA para brasileiros).

USUÁRIO: ${userName} | ${userEmail}
CONTEXTO: ${context || "Novo usuário cadastrado"}
APP: https://ai-finance-app-ashen.vercel.app

SEQUÊNCIA:
1. Imediato - Boas-vindas + primeiro passo claro
2. Dia 1 - Cadastrar renda mensal
3. Dia 2 - Adicionar gastos principais
4. Dia 3 - Definir primeira meta
5. Dia 5 - Conectar Open Finance
6. Dia 7 - Apresentar Assessor IA
7. Dia 14 - Re-engajamento empático

RETORNE SOMENTE JSON VÁLIDO:
{"sequence":[{"day":0,"subject":"assunto curto impactante max 50 chars","preview":"preview max 90 chars","plain":"texto do email em português, max 120 palavras, amigável, 1 CTA claro, use nome ${userName}, dado real do Brasil"}]}

REGRAS: português brasileiro natural, assunto com alta abertura, 1 objetivo por email, mencione iMoney organicamente.`;
}

export async function POST(req: NextRequest) {
  try {
    const { userName, userEmail, context, sendNow = false } = await req.json();
    if (!userName || !userEmail) throw new Error("Nome e email são obrigatórios");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: "Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.",
      messages: [{ role: "user", content: buildPrompt(userName, userEmail, context) }],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida do modelo");
    const parsed = JSON.parse(match[0]);

    parsed.sequence = parsed.sequence.map((email: any) => ({
      ...email,
      html: buildEmailHTML(email.subject, email.plain),
    }));

    if (sendNow && parsed.sequence?.[0]) {
      const first = parsed.sequence[0];
      await resend.emails.send({
        from: "iMoney <onboarding@resend.dev>",
        to: userEmail,
        subject: first.subject,
        html: first.html,
        text: first.plain,
      });
    }

    return NextResponse.json({ ...parsed, sent: sendNow });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
