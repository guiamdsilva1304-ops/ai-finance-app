import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildEmailHTML(subject: string, body: string): string {
  const bodyHtml = body.split("\n").filter(Boolean).map(p => `<p style="margin:0 0 12px">${p}</p>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#f0fdf4;font-family:Nunito,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:28px 32px;text-align:center">
<span style="color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px">💚 iMoney</span>
<p style="color:#dcfce7;font-size:13px;margin:4px 0 0;font-weight:600">Seu assessor financeiro com IA</p>
</td></tr>
<tr><td style="padding:36px 32px">
<h1 style="color:#14532d;font-size:20px;font-weight:800;margin:0 0 20px;line-height:1.3">${subject}</h1>
<div style="color:#374151;font-size:15px;line-height:1.8">${bodyHtml}</div>
<div style="margin:32px 0;text-align:center">
<a href="https://ai-finance-app-ashen.vercel.app/dashboard" style="background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:800;font-size:15px;display:inline-block">
Abrir iMoney →</a></div>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0fdf4;text-align:center">
<p style="color:#9ca3af;font-size:12px;margin:0">Você recebe este email por ser usuário do iMoney.<br>
© 2026 iMoney · Feito com 💚 no Brasil</p>
</td></tr></table></td></tr></table></body></html>`;
}

async function generateEmailWithAI(prompt: string): Promise<{ subject: string; body: string }> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: "Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.",
    messages: [{ role: "user", content: prompt }],
  });
  const raw = msg.content.filter(b => b.type === "text").map((b: any) => b.text).join("").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Resposta inválida da IA");
  return JSON.parse(match[0]);
}

async function sendEmail(to: string, subject: string, body: string) {
  return resend.emails.send({
    from: "iMoney <onboarding@resend.dev>",
    to,
    subject,
    html: buildEmailHTML(subject, body),
    text: body,
  });
}

async function sendWelcomeEmails() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: users } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, nome")
    .gte("created_at", twoHoursAgo)
    .eq("welcome_sent", false);
  if (!users?.length) return { welcome: 0 };
  let count = 0;
  for (const user of users) {
    try {
      const nome = user.nome || user.email.split("@")[0];
      const { subject, body } = await generateEmailWithAI(`Crie um email de boas-vindas para ${nome} que acabou de se cadastrar no iMoney, app gratuito de finanças pessoais com IA para brasileiros. O email deve ser caloroso, motivador e indicar 3 primeiros passos simples (cadastrar renda, adicionar gastos, conversar com a IA). Máx 120 palavras. Tom amigável e brasileiro. Retorne JSON: {"subject":"assunto impactante max 50 chars","body":"texto do email com quebras de linha \\n"}`);
      await sendEmail(user.email, subject, body);
      await supabaseAdmin.from("user_profiles").update({ welcome_sent: true }).eq("id", user.id);
      count++;
    } catch (e) { console.error(`Welcome error ${user.email}:`, e); }
  }
  return { welcome: count };
}

async function sendFollowUpEmails() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: users } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, nome, last_login_at")
    .lte("last_login_at", sevenDaysAgo)
    .gte("last_login_at", fourteenDaysAgo)
    .eq("followup_sent", false);
  if (!users?.length) return { followup: 0 };
  let count = 0;
  for (const user of users) {
    try {
      const nome = user.nome || user.email.split("@")[0];
      const dias = Math.floor((Date.now() - new Date(user.last_login_at).getTime()) / 86400000);
      const { subject, body } = await generateEmailWithAI(`Crie um email de follow-up empático para ${nome}, usuário do iMoney que está há ${dias} dias sem entrar. O email deve ser acolhedor, sem pressão, e lembrar de 1 benefício prático (assessor IA gratuito). Máx 100 palavras. Tom humano e brasileiro. Retorne JSON: {"subject":"assunto curioso max 50 chars","body":"texto com quebras de linha \\n"}`);
      await sendEmail(user.email, subject, body);
      await supabaseAdmin.from("user_profiles").update({ followup_sent: true }).eq("id", user.id);
      count++;
    } catch (e) { console.error(`Followup error ${user.email}:`, e); }
  }
  return { followup: count };
}

async function sendWeeklyEmails() {
  const today = new Date();
  if (today.getDay() !== 1) return { weekly: 0 };
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { data: users } = await supabaseAdmin.from("user_profiles").select("id, email, nome");
  if (!users?.length) return { weekly: 0 };
  let count = 0;
  for (const user of users) {
    try {
      const nome = user.nome || user.email.split("@")[0];
      const { data: tx } = await supabaseAdmin.from("transactions").select("valor, tipo, categoria").eq("user_id", user.id).gte("date", weekAgo.toISOString().split("T")[0]);
      const gastos = (tx ?? []).filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.valor), 0);
      const renda = (tx ?? []).filter(t => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
      const { subject, body } = await generateEmailWithAI(`Crie email de resumo semanal para ${nome} no iMoney. Dados: ${tx?.length ?? 0} transações, R$ ${renda.toFixed(2)} renda, R$ ${gastos.toFixed(2)} gastos, sobra R$ ${(renda-gastos).toFixed(2)}. ${!tx?.length ? "Usuário não lançou transações — incentive." : "Dê 1 dica financeira prática."} Máx 120 palavras. Retorne JSON: {"subject":"resumo semanal max 50 chars","body":"texto com \\n"}`);
      await sendEmail(user.email, subject, body);
      count++;
    } catch (e) { console.error(`Weekly error ${user.email}:`, e); }
  }
  return { weekly: count };
}

async function sendMonthlyEmails() {
  const today = new Date();
  if (today.getDate() !== 1) return { monthly: 0 };
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const monthName = lastMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" });
  const { data: users } = await supabaseAdmin.from("user_profiles").select("id, email, nome");
  if (!users?.length) return { monthly: 0 };
  let count = 0;
  for (const user of users) {
    try {
      const nome = user.nome || user.email.split("@")[0];
      const { data: tx } = await supabaseAdmin.from("transactions").select("valor, tipo, categoria").eq("user_id", user.id).gte("date", lastMonth.toISOString().split("T")[0]).lte("date", lastMonthEnd.toISOString().split("T")[0]);
      const gastos = (tx ?? []).filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.valor), 0);
      const renda = (tx ?? []).filter(t => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
      const cats: Record<string, number> = {};
      (tx ?? []).filter(t => t.tipo === "gasto").forEach(t => { cats[t.categoria] = (cats[t.categoria] ?? 0) + Number(t.valor); });
      const topCats = Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0,3).map(([c,v]) => `${c}: R$ ${v.toFixed(2)}`).join(", ");
      const { subject, body } = await generateEmailWithAI(`Crie email de resumo mensal para ${nome} no iMoney. Mês: ${monthName}. Dados: R$ ${renda.toFixed(2)} renda, R$ ${gastos.toFixed(2)} gastos, sobra R$ ${(renda-gastos).toFixed(2)}. ${topCats ? `Top gastos: ${topCats}.` : "Sem gastos registrados."} ${renda-gastos > 0 ? "Sugira onde investir (Tesouro Selic, CDB)." : "Dê dicas para equilibrar no próximo mês."} Máx 150 palavras. Retorne JSON: {"subject":"resumo mensal impactante max 50 chars","body":"texto com \\n"}`);
      await sendEmail(user.email, subject, body);
      count++;
    } catch (e) { console.error(`Monthly error ${user.email}:`, e); }
  }
  return { monthly: count };
}

export async function GET(req: NextRequest) {
  // auth desativada temporariamente para debug
  try {
    const [welcome, followup, weekly, monthly] = await Promise.all([
      sendWelcomeEmails(),
      sendFollowUpEmails(),
      sendWeeklyEmails(),
      sendMonthlyEmails(),
    ]);
    return NextResponse.json({ ok: true, ...welcome, ...followup, ...weekly, ...monthly });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
