// frontend/app/api/whatsapp/webhook/route.ts
//
// Webhook Meta Cloud API → Assessor IA iMoney
//
// Fluxo:
//   1. Meta envia GET para verificar o webhook (hub.challenge)
//   2. Meta envia POST ao receber mensagem no número da iMoney
//   3. Rota ignora mensagens de status e não-texto
//   4. Busca o usuário pelo número de telefone no Supabase
//   5. Busca contexto financeiro (renda, gastos, metas, perfil)
//   6. Chama o Anthropic com o system prompt do Assessor
//   7. Salva no chat_history e incrementa contador de mensagens
//   8. Responde via Meta Graph API

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// ─── Clientes ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Variáveis de ambiente Meta ────────────────────────────────────────────────
// Adicione/atualize estas variáveis no Vercel:
//   WHATSAPP_TOKEN          → Token de acesso permanente (Graph API)
//   WHATSAPP_PHONE_NUMBER_ID → Phone Number ID do painel Meta for Developers
//   WHATSAPP_VERIFY_TOKEN   → Token de verificação do webhook (você define)

const WHATSAPP_TOKEN           = process.env.WHATSAPP_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WHATSAPP_VERIFY_TOKEN    = process.env.WHATSAPP_VERIFY_TOKEN!;

const LIMITE_FREE = 15;
const LIMITE_PRO  = 50;

// ─── GET — Verificação do webhook pela Meta ────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("[whatsapp/webhook] Webhook verificado com sucesso");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ─── Helpers de limite ─────────────────────────────────────────────────────────

async function verificarLimite(userId: string) {
  const { data: perfil } = await supabase
    .from("user_profiles")
    .select("plan, daily_messages_count, daily_messages_date")
    .eq("user_id", userId)
    .single();

  const plano = perfil?.plan ?? "free";
  if (plano === "premium") return { permitido: true, usadas: 0, limite: 0, plano };

  const limite = plano === "pro" ? LIMITE_PRO : LIMITE_FREE;
  const hoje   = new Date().toISOString().split("T")[0];
  const usadas =
    perfil?.daily_messages_date === hoje ? (perfil.daily_messages_count ?? 0) : 0;

  return { permitido: usadas < limite, usadas, limite, plano };
}

async function incrementarContador(userId: string) {
  const hoje = new Date().toISOString().split("T")[0];
  const { data: perfil } = await supabase
    .from("user_profiles")
    .select("daily_messages_count, daily_messages_date")
    .eq("user_id", userId)
    .single();

  const count =
    perfil?.daily_messages_date === hoje ? (perfil.daily_messages_count ?? 0) : 0;

  await supabase
    .from("user_profiles")
    .update({ daily_messages_count: count + 1, daily_messages_date: hoje })
    .eq("user_id", userId);
}

// ─── Envio de mensagem via Meta Graph API ─────────────────────────────────────

async function enviarMensagem(telefone: string, texto: string) {
  await fetch(
    `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefone,
        type: "text",
        text: { body: texto },
      }),
    }
  );
}

// ─── Busca histórico recente do usuário (últimas 20 msgs) ──────────────────────

async function buscarHistorico(userId: string) {
  const { data } = await supabase
    .from("chat_history")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).reverse();
}

// ─── System prompt otimizado para WhatsApp ────────────────────────────────────

function buildSystemPrompt(context: Record<string, unknown>, isPro: boolean): string {
  const renda  = Number(context.renda  ?? 0).toFixed(2);
  const gastos = Number(context.gastos ?? 0).toFixed(2);
  const sobra  = Number(context.sobra  ?? 0).toFixed(2);
  const selic  = context.selic ?? 14.50;

  const base = `Você é o Assessor da iMoney respondendo via WhatsApp.
Tom: parceiro próximo, direto, humano, sem jargão de banco.
Máximo 160 palavras por resposta — texto de WhatsApp, não relatório.
Parágrafos curtos. Sem tabelas markdown. Máximo 1 emoji.
Sempre termine com UMA ação concreta pequena que o usuário pode fazer hoje.

DADOS DO USUÁRIO:
- Renda: R$ ${renda}/mês
- Gastos: R$ ${gastos}/mês
- Sobra: R$ ${sobra}/mês
- SELIC: ${selic}% a.a.
- Metas: ${JSON.stringify(context.metas ?? [])}
- Plano: ${isPro ? "Pro ✨" : "Free"}`;

  if (!isPro) {
    return (
      base +
      `\n\nSe uma análise mais profunda ajudaria, diga de forma natural: "No Pro eu analiso isso com seus dados reais 💡"`
    );
  }

  return (
    base +
    `\n
Perfil: ${JSON.stringify(context.perfil ?? {})}
Gastos por categoria: ${JSON.stringify(context.gastosCat ?? {})}
Investimentos: ${JSON.stringify(context.investimentos ?? [])}

REGRA PRO: use os dados reais para personalizar cada resposta.
Se sobra > 0: sugira onde alocar com valor concreto.
Se sobra ≤ 0: foque em equilibrar antes de qualquer meta.`
  );
}


async function validarAssinatura(req: NextRequest, rawBody: string): Promise<boolean> {
  const signature = req.headers.get("x-hub-signature-256");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const hex = Array.from(new Uint8Array(signed)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return signature === `sha256=${hex}`;
}
// ─── POST — Recebe mensagens da Meta ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!await validarAssinatura(req, rawBody)) return new NextResponse("Unauthorized", { status: 401 });
    const body = JSON.parse(rawBody);

    // Confirma que é um evento do WhatsApp Business
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true });
    }

    // Extrai a mensagem do payload da Meta
    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    // Ignora eventos que não são mensagens (status updates, etc.)
    const mensagens = value?.messages;
    if (!mensagens?.length) return NextResponse.json({ ok: true });

    const msg = mensagens[0];

    // Ignora mensagens não-texto (imagem, áudio, etc.)
    if (msg.type !== "text") return NextResponse.json({ ok: true });

    // Extrai telefone e texto
    // Meta envia telefone no formato "5521999999999" (sem + ou @)
    const telefone: string = msg.from ?? "";
    const texto: string    = msg.text?.body ?? "";

    if (!telefone || !texto) return NextResponse.json({ ok: true });

    // Busca usuário pelo telefone no Supabase
    const { data: perfil } = await supabase
      .from("user_profiles")
      .select("user_id, plan, renda_mensal, gastos_mensais, monthly_available, diagnostico_json, score_saude")
      .eq("phone", telefone)
      .single();

    // Usuário não cadastrado na iMoney
    if (!perfil) {
      await enviarMensagem(
        telefone,
        "Oi! 👋 Ainda não encontrei sua conta iMoney vinculada a este número.\n\nAcesse imoney.ia.br, crie sua conta e vincule este número no seu perfil para eu poder te ajudar com suas finanças!"
      );
      return NextResponse.json({ ok: true });
    }

    const userId = perfil.user_id;
    const isPro  = perfil.plan === "pro" || perfil.plan === "premium";

    // Verifica limite de mensagens
    const { permitido, limite, plano } = await verificarLimite(userId);

    if (!permitido) {
      await enviarMensagem(
        telefone,
        `Você atingiu o limite de ${limite} mensagens de hoje no plano Free.\n\nAssine o Pro por R$29,90/mês e tenha 50 msgs/dia + análise completa dos seus dados 🚀\nimoney.ia.br/dashboard/pro`
      );
      return NextResponse.json({ ok: true });
    }

    // Busca contexto financeiro
    const trinta_dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const [metasRes, summaryRes, investRes, categoriaRes] = await Promise.allSettled([
      supabase.from("metas").select("nome, valor_alvo, valor_atual, prazo").eq("user_id", userId),
      supabase.from("transactions").select("valor, tipo").eq("user_id", userId).gte("data", trinta_dias),
      isPro
        ? supabase.from("user_investments").select("nome, tipo, valor_brl, valor_original").eq("user_id", userId)
        : Promise.resolve({ data: [] }),
      isPro
        ? supabase.from("transactions").select("categoria, valor").eq("user_id", userId).eq("tipo", "gasto").gte("data", trinta_dias)
        : Promise.resolve({ data: [] }),
    ]);

    const metas       = metasRes.status     === "fulfilled" ? (metasRes.value.data     ?? []) : [];
    const investimentos = investRes.status  === "fulfilled" ? (investRes.value.data    ?? []) : [];

    let renda = 0; let gastos = 0;
    if (summaryRes.status === "fulfilled") {
      for (const tx of summaryRes.value.data ?? []) {
        if (tx.tipo === "receita") renda  += Number(tx.valor);
        if (tx.tipo === "gasto")   gastos += Number(tx.valor);
      }
    }
    if (renda  === 0) renda  = Number(perfil.renda_mensal  ?? 0);
    if (gastos === 0) gastos = Number(perfil.gastos_mensais ?? 0);

    const gastosCat: Record<string, number> = {};
    if (isPro && categoriaRes.status === "fulfilled") {
      for (const tx of categoriaRes.value.data ?? []) {
        gastosCat[tx.categoria] = (gastosCat[tx.categoria] ?? 0) + Number(tx.valor);
      }
    }

    const context = {
      renda, gastos, sobra: renda - gastos,
      metas, gastosCat, investimentos,
      perfil: perfil.diagnostico_json ?? {},
      selic: 14.50,
    };

    // Busca histórico e monta conversa
    const historico = await buscarHistorico(userId);
    const mensagensParaAPI = [
      ...historico.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: texto },
    ];

    // Chama o Anthropic
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: buildSystemPrompt(context, isPro),
      messages: mensagensParaAPI,
    });

    const reply =
      response.content[0].type === "text"
        ? response.content[0].text
        : "Desculpe, não consegui processar sua mensagem.";

    const replyLimpo = reply.replace(/```[\s\S]*?```/g, "").trim();

    // Salva histórico e incrementa contador em paralelo
    await Promise.allSettled([
      supabase.from("chat_history").insert([
        { user_id: userId, role: "user",      content: texto,      created_at: new Date().toISOString() },
        { user_id: userId, role: "assistant", content: replyLimpo, created_at: new Date().toISOString() },
      ]),
      plano !== "premium" ? incrementarContador(userId) : Promise.resolve(),
    ]);

    // Envia resposta via Meta Graph API
    await enviarMensagem(telefone, replyLimpo);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp/webhook] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
