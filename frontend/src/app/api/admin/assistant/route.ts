import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";
import { computeKpis } from "@/lib/admin-kpis";
import { calcularScore, segmentoDoScore } from "@/lib/admin-score";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMsg { role: "user" | "assistant"; content: string }

async function montarContexto(): Promise<string> {
  try {
    const dias7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [kpis, profilesRes, msgsRes, metasRes, txRes] = await Promise.all([
      computeKpis(supabase),
      supabase
        .from("user_profiles")
        .select("user_id, nome, nome_preferido, plan, last_login_at, phone, control_streak_days")
        .order("last_login_at", { ascending: false, nullsFirst: false })
        .limit(50),
      supabase.from("chat_history").select("user_id, created_at").eq("role", "user").order("created_at", { ascending: false }).limit(5000),
      supabase.from("metas").select("user_id").limit(2000),
      supabase.from("transactions").select("user_id, created_at").gte("created_at", dias7).limit(5000),
    ]);

    const msgsCount = new Map<string, number>();
    const msgs7dCount = new Map<string, number>();
    for (const m of msgsRes.data ?? []) {
      msgsCount.set(m.user_id, (msgsCount.get(m.user_id) ?? 0) + 1);
      if (m.created_at >= dias7) msgs7dCount.set(m.user_id, (msgs7dCount.get(m.user_id) ?? 0) + 1);
    }
    const comMeta = new Set((metasRes.data ?? []).map(m => m.user_id));
    const comTx7d = new Set((txRes.data ?? []).map(t => t.user_id));

    const usuarios = (profilesRes.data ?? []).map(p => {
      const score = calcularScore({
        last_login_at: p.last_login_at,
        temMeta: comMeta.has(p.user_id),
        temTransacao7d: comTx7d.has(p.user_id),
        totalMsgs: msgsCount.get(p.user_id) ?? 0,
      });
      const diasSemAcesso = p.last_login_at
        ? Math.floor((Date.now() - new Date(p.last_login_at).getTime()) / 86_400_000)
        : null;
      return {
        nome: p.nome_preferido || p.nome || "sem nome",
        plano: p.plan ?? "free",
        score,
        segmento: segmentoDoScore(score),
        dias_sem_acesso: diasSemAcesso,
        msgs_7d: msgs7dCount.get(p.user_id) ?? 0,
        tem_whatsapp: !!p.phone,
        streak_dias: p.control_streak_days ?? 0,
      };
    });

    return [
      "MÉTRICAS DA PLATAFORMA (agora):",
      `- MRR: R$ ${kpis.mrr.toFixed(2)} (Pro R$14,90 + Premium R$39,90)`,
      `- Pagantes: ${kpis.pagantes} de ${kpis.totalUsuarios} usuários (${kpis.trialPaid.toFixed(1)}% trial→paid)`,
      `- DAU hoje: ${kpis.dau} · MAU 30d: ${kpis.mau} · ratio ${kpis.dauMau.toFixed(0)}%`,
      `- Churn proxy 30d (sem acesso há +30d): ${kpis.churn30d.toFixed(1)}%`,
      `- Msgs/usuário ativo (7d): ${kpis.msgsPorUser.toFixed(1)}`,
      "",
      "USUÁRIOS (até 50, ordenados por último acesso; score 0-100 de propensão; sem dados sensíveis):",
      JSON.stringify(usuarios),
    ].join("\n");
  } catch (e) {
    return `Métricas indisponíveis no momento (${e instanceof Error ? e.message : "erro"}). Diga isso ao usuário se ele pedir dados.`;
  }
}

export async function POST(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const messages = body.messages;
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 40 ||
    !messages.every(
      (m): m is ChatMsg =>
        m && typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" && m.content.length > 0 && m.content.length <= 4000
    )
  ) {
    return NextResponse.json({ error: "messages inválido" }, { status: 400 });
  }

  try {
    const contexto = await montarContexto();
    const system = [
      "Você é o assistente de dados da iMoney, app brasileiro de finanças pessoais com IA.",
      "Você responde ao FUNDADOR no painel admin. Sem limite de mensagens.",
      "Você tem acesso às métricas da plataforma abaixo. Responda perguntas sobre usuários, engajamento, MRR e crescimento de forma direta e com dados reais quando disponíveis.",
      "Quando citar usuários, use o nome e o motivo (score, dias sem acesso, msgs). Seja conciso e acionável — você fala com quem decide.",
      "Você NÃO tem acesso a senhas, tokens ou conteúdo das conversas dos usuários. Se perguntarem, diga que isso fica fora do seu escopo.",
      "Contexto de negócio: burn R$ 660/mês, break-even ~22 pagantes, meta 100 pagantes em 6 meses.",
      "",
      contexto,
    ].join("\n");

    const resposta = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: messages as ChatMsg[],
    });

    const texto = resposta.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("\n");

    return NextResponse.json({ reply: texto });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
