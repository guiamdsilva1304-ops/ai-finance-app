// frontend/app/api/whatsapp/webhook/route.ts
//
// Webhook Z-API → Assessor IA iMoney
//
// Fluxo:
//   1. Z-API envia POST ao receber mensagem no número da iMoney
//   2. Rota valida o Client Token (segurança)
//   3. Busca o usuário pelo número de telefone no Supabase
//   4. Busca contexto financeiro (renda, gastos, metas, perfil, memória)
//   5. Chama o Anthropic com o mesmo system prompt do /api/chat
//   6. Salva no chat_history e incrementa contador de mensagens
//   7. Responde via Z-API REST

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

// ─── Variáveis de ambiente Z-API ───────────────────────────────────────────────
// Adicione estas variáveis no Vercel:
//   ZAPI_INSTANCE_ID    → ID da instância (ex: 3F4592FC23609137F967...)
//   ZAPI_INSTANCE_TOKEN → Token da instância (ex: 979F4AF7A73F34CF72B64B26)
//   ZAPI_CLIENT_TOKEN   → Client Token (gerado em Segurança no painel Z-API)

const ZAPI_INSTANCE_ID    = process.env.ZAPI_INSTANCE_ID!;
const ZAPI_INSTANCE_TOKEN = process.env.ZAPI_INSTANCE_TOKEN!;
const ZAPI_CLIENT_TOKEN   = process.env.ZAPI_CLIENT_TOKEN!;

const LIMITE_FREE = 15;
const LIMITE_PRO  = 50;

// ─── Helpers de limite (igual ao /api/chat) ────────────────────────────────────

async function verificarLimite(userId: string) {
  const { data: perfil } = await supabase
    .from("user_profiles")
    .select("plan, daily_messages_count, daily_messages_date")
    .eq("user_id", userId)
    .single();

  const plano = perfil?.plan ?? "free";
  if (plano === "premium") return { permitido: true, usadas: 0, limite: 0, plano };

  const limite = plano === "pro" ? LIMITE_PRO : LIMITE_FREE;
  const hoje = new Date().toISOString().split("T")[0];
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

// ─── Envio de mensagem via Z-API ───────────────────────────────────────────────

async function enviarMensagem(telefone: string, texto: string) {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify({
      phone: telefone, // formato: "5521999999999" (sem + ou espaços)
      message: texto,
    }),
  });
}

// ─── Busca histórico recente do usuário (últimas 20 msgs) ──────────────────────

async function buscarHistorico(userId: string) {
  const { data } = await supabase
    .from("chat_history")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).reverse(); // mais antigas primeiro
}

// ─── System prompt simplificado para WhatsApp ─────────────────────────────────
// Versão enxuta do prompt do /api/chat, otimizada para leitura em celular

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

// ─── Rota principal ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Valida Client Token da Z-API (segurança básica)
    const clientToken = req.headers.get("client-token");
    if (clientToken !== ZAPI_CLIENT_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parseia payload da Z-API
    const body = await req.json();

    // Z-API envia vários tipos de evento — só processa mensagens de texto recebidas
    // Ignora: mensagens enviadas pelo próprio número, status, etc.
    if (body.fromMe || !body.text?.message) {
      return NextResponse.json({ ok: true });
    }

    const telefone: string = body.phone;      // ex: "5521999999999"
    const texto: string    = body.text.message;

    // 3. Busca usuário pelo telefone no Supabase
    // O campo "phone" em user_profiles deve estar no formato "5521999999999"
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

    // 4. Verifica limite de mensagens
    const { permitido, usadas, limite, plano } = await verificarLimite(userId);

    if (!permitido) {
      await enviarMensagem(
        telefone,
        `Você atingiu o limite de ${limite} mensagens de hoje no plano Free.\n\nAssine o Pro por R$29,90/mês e tenha 50 msgs/dia + análise completa dos seus dados 🚀\nimoney.ia.br/dashboard/pro`
      );
      return NextResponse.json({ ok: true });
    }

    // 5. Busca contexto financeiro do usuário
    const trinta_dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const [metasRes, summaryRes, investRes, categoriaRes] = await Promise.allSettled([
      supabase
        .from("metas")
        .select("nome, valor_alvo, valor_atual, prazo")
        .eq("user_id", userId),
      supabase
        .from("transactions")
        .select("valor, tipo")
        .eq("user_id", userId)
        .gte("data", trinta_dias),
      isPro
        ? supabase
            .from("user_investments")
            .select("nome, tipo, valor_brl, valor_original")
            .eq("user_id", userId)
        : Promise.resolve({ data: [] }),
      isPro
        ? supabase
            .from("transactions")
            .select("categoria, valor")
            .eq("user_id", userId)
            .eq("tipo", "gasto")
            .gte("data", trinta_dias)
        : Promise.resolve({ data: [] }),
    ]);

    const metas       = metasRes.status === "fulfilled" ? (metasRes.value.data ?? []) : [];
    const investimentos = investRes.status === "fulfilled" ? (investRes.value.data ?? []) : [];

    // Calcula renda e gastos a partir das transações reais
    let renda = 0; let gastos = 0;
    if (summaryRes.status === "fulfilled") {
      for (const tx of summaryRes.value.data ?? []) {
        if (tx.tipo === "receita") renda  += Number(tx.valor);
        if (tx.tipo === "gasto")   gastos += Number(tx.valor);
      }
    }
    // Fallback para dados declarados no perfil
    if (renda  === 0) renda  = Number(perfil.renda_mensal  ?? 0);
    if (gastos === 0) gastos = Number(perfil.gastos_mensais ?? 0);

    // Gastos por categoria (Pro)
    const gastosCat: Record<string, number> = {};
    if (isPro && categoriaRes.status === "fulfilled") {
      for (const tx of categoriaRes.value.data ?? []) {
        gastosCat[tx.categoria] = (gastosCat[tx.categoria] ?? 0) + Number(tx.valor);
      }
    }

    const context = {
      renda,
      gastos,
      sobra: renda - gastos,
      metas,
      gastosCat,
      investimentos,
      perfil: perfil.diagnostico_json ?? {},
      selic: 14.50, // TODO: buscar de /api/rates/eco se quiser dinamizar
    };

    // 6. Busca histórico e monta conversa
    const historico = await buscarHistorico(userId);
    const mensagensParaAPI = [
      ...historico.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: texto },
    ];

    // 7. Chama o Anthropic
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024, // mais curto que o web — WhatsApp pede brevidade
      system: buildSystemPrompt(context, isPro),
      messages: mensagensParaAPI,
    });

    const reply =
      response.content[0].type === "text" ? response.content[0].text : "Desculpe, não consegui processar sua mensagem.";

    // Remove blocos ```plano se o modelo gerar — WhatsApp não renderiza isso
    const replyLimpo = reply.replace(/```plano[\s\S]*?```/g, "").trim();

    // 8. Salva no histórico e incrementa contador
    await Promise.allSettled([
      supabase.from("chat_history").insert([
        { user_id: userId, role: "user",      content: texto,      created_at: new Date().toISOString() },
        { user_id: userId, role: "assistant", content: replyLimpo, created_at: new Date().toISOString() },
      ]),
      plano !== "premium" ? incrementarContador(userId) : Promise.resolve(),
    ]);

    // 9. Envia resposta via Z-API
    await enviarMensagem(telefone, replyLimpo);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp/webhook] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
