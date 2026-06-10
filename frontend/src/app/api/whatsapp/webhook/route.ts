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
import { variantesTelefoneBR } from "@/lib/phone";

export const dynamic = "force-dynamic";

// ─── Clientes ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'sk-ant-placeholder' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
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
Exceção: quando o usuário apenas registrar um gasto ou receita, termine com UMA observação sobre o impacto financeiro dessa transação — ex: "Isso te deixa R$X mais perto de [meta]" ou "Você já gastou R$X em [categoria] este mês."

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
Gastos por categoria (mês atual): ${JSON.stringify(context.gastosCat ?? {})}
Investimentos: ${JSON.stringify(context.investimentos ?? [])}

REGRA PRO: use os dados reais para personalizar cada resposta.
Se sobra > 0: sugira onde alocar com valor concreto.
Se sobra ≤ 0: foque em equilibrar antes de qualquer meta.

PROATIVIDADE EM TRANSAÇÕES — OBRIGATÓRIO:
Quando o usuário mencionar gasto ou receita, termine com UMA observação de impacto usando dados reais.
Use gastos por categoria do mês atual e metas para personalizar.
Ex: "Esse gasto está dentro do seu padrão de alimentação ✅" | "Com isso, você precisa de R$X para [meta]." | "⚠️ Você já usou R$X em [categoria] este mês."`
  );
}


async function validarAssinatura(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    // Sem o app secret configurado não dá para validar; não derruba o webhook em produção.
    console.warn("[whatsapp] WHATSAPP_APP_SECRET não configurado — assinatura não validada");
    return true;
  }
  const signature = req.headers.get("x-hub-signature-256");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const hex = Array.from(new Uint8Array(signed)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return signature === `sha256=${hex}`;
}

// ─── Detecta e salva transação pendente ───────────────────────────────────────

async function detectarTransacao(texto: string, userId: string, isPro: boolean): Promise<boolean> {
  const prompt = `Analise se a mensagem abaixo é um registro de transação financeira.
Se for, responda APENAS com JSON no formato:
{"é_transacao": true, "descricao": "...", "valor": 00.00, "categoria": "...", "tipo": "gasto" ou "receita"}
Categorias válidas: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Salário, Freelance, Outros
Se NÃO for transação, responda APENAS: {"é_transacao": false}

Mensagem: ${texto}`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
  try {
    const parsed = JSON.parse(raw);
    const tipoValido = parsed.tipo === "gasto" || parsed.tipo === "receita";
    if (!parsed["é_transacao"] || !parsed.descricao || !(Number(parsed.valor) > 0) || !tipoValido) {
      return false;
    }

    await supabase.from("whatsapp_pending_transactions").delete().eq("user_id", userId);
    await supabase.from("whatsapp_pending_transactions").insert({
      user_id: userId,
      descricao: parsed.descricao,
      valor: parsed.valor,
      categoria: parsed.categoria,
      tipo: parsed.tipo,
    });
    return true;
  } catch {
    return false;
  }
}

async function confirmarTransacao(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("whatsapp_pending_transactions")
    .select("*")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error?.code === "PGRST116") return null; // sem pendente — esperado
  if (error) throw error;                      // erro real — propaga
  if (!data) return null;

  await supabase.from("transactions").insert({
    user_id: userId,
    descricao: data.descricao,
    valor: data.valor,
    categoria: data.categoria,
    tipo: data.tipo,
    date: new Date().toISOString().split("T")[0],
    source: "whatsapp",
  });

  await supabase.from("whatsapp_pending_transactions").delete().eq("user_id", userId);

  return `✅ Registrado: ${data.tipo === "gasto" ? "Gasto" : "Receita"} de R$${Number(data.valor).toFixed(2)} em ${data.categoria} (${data.descricao})`;
}

async function cancelarTransacao(userId: string): Promise<void> {
  await supabase.from("whatsapp_pending_transactions").delete().eq("user_id", userId);
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

    // Meta reenvia o webhook se não receber 200 rápido — ignora msg.id já processado
    if (msg.id) {
      const { error: dupErr } = await supabase
        .from("whatsapp_processed_messages")
        .insert({ message_id: msg.id });
      if (dupErr) {
        if (dupErr.code === "23505") return NextResponse.json({ ok: true }); // duplicada
        console.error("[whatsapp] dedup indisponível, processando assim mesmo:", dupErr.message);
      }
    }

    // Reações continuam ignoradas; demais não-texto ganham resposta fixa
    if (msg.type !== "text") {
      if (msg.type !== "reaction" && msg.from) {
        await enviarMensagem(
          msg.from,
          "Por enquanto só consigo responder mensagens de texto. 📝\n\nPara registrar gastos, me mande algo como: 'gastei 50 reais no mercado'."
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Extrai telefone e texto
    // Meta envia telefone no formato "5521999999999" (sem + ou @)
    const telefone: string = msg.from ?? "";
    const texto: string    = msg.text?.body ?? "";

    if (!telefone || !texto) return NextResponse.json({ ok: true });

    // Busca usuário pelo telefone no Supabase (wa_id pode vir com ou sem o nono dígito)
    const { data: perfis } = await supabase
      .from("user_profiles")
      .select("user_id, plan, renda_mensal, gastos_mensais, monthly_available, diagnostico_json, score_saude")
      .in("phone", variantesTelefoneBR(telefone))
      .limit(1);
    const perfil = perfis?.[0] ?? null;

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
        plano === "pro"
          ? "Você atingiu seu limite de mensagens hoje. 🚀\n\nAcesse imoney.ia.br para fazer upgrade para o Premium e ter mensagens ilimitadas."
          : "Você atingiu seu limite de mensagens hoje. 🚀\n\nAcesse imoney.ia.br para fazer upgrade para o Pro."
      );
      return NextResponse.json({ ok: true });
    }

    // Busca contexto financeiro
    const trinta_dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const _now = new Date()
    const inicio_mes = `${_now.getUTCFullYear()}-${String(_now.getUTCMonth() + 1).padStart(2, '0')}-01`

    const [metasRes, summaryRes, investRes, categoriaRes] = await Promise.allSettled([
      supabase.from("metas").select("nome, valor_alvo, valor_atual, prazo").eq("user_id", userId),
      supabase.from("transactions").select("valor, tipo").eq("user_id", userId).gte("date", trinta_dias),
      isPro
        ? supabase.from("user_investments").select("nome, tipo, valor_brl, valor_original").eq("user_id", userId)
        : Promise.resolve({ data: [] }),
      isPro
        ? supabase.from("transactions").select("categoria, valor").eq("user_id", userId).eq("tipo", "gasto").gte("date", inicio_mes)
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


    // Verifica se é confirmação/cancelamento de transação pendente
    const textoLower = texto.toLowerCase().trim();
    if (["sim", "s", "yes", "confirma", "confirmar", "ok"].includes(textoLower)) {
      const resultado = await confirmarTransacao(userId);
      if (resultado) {
        await enviarMensagem(telefone, resultado);
        return NextResponse.json({ ok: true });
      }
    }
    if (["não", "nao", "n", "no", "cancelar", "cancela"].includes(textoLower)) {
      await cancelarTransacao(userId);
      await enviarMensagem(telefone, "Tudo bem, transação cancelada! 👍");
      return NextResponse.json({ ok: true });
    }

    // Verifica se é registro de transação
    const éTransacao = await detectarTransacao(texto, userId, isPro);
    if (éTransacao) {
      const { data: pendente } = await supabase
        .from("whatsapp_pending_transactions")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (pendente) {
        await enviarMensagem(
          telefone,
          `Vou registrar: ${pendente.tipo === "gasto" ? "Gasto" : "Receita"} de R$${Number(pendente.valor).toFixed(2)} em ${pendente.categoria} (${pendente.descricao}). Confirma? (sim/não)`
        );
        return NextResponse.json({ ok: true });
      }
    }

    // Busca histórico e monta conversa
    const historico = await buscarHistorico(userId);
    const mensagensParaAPI = [
      ...historico.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: texto },
    ];

    // Chama o Anthropic
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
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
      supabase.from("whatsapp_processed_messages").delete()
        .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Envia resposta via Meta Graph API
    await enviarMensagem(telefone, replyLimpo);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp/webhook] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
