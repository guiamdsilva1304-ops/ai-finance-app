import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

// Catálogo estático: agente → cron do vercel.json (UTC). Agentes sem cron são manuais.
const CATALOGO = [
  { id: "SEO", nome: "Agente SEO", emoji: "✍️", cron: "0 7 * * 1,3,5", cronLabel: "seg/qua/sex 07:00 UTC" },
  { id: "GRW", nome: "Agente Growth", emoji: "📈", cron: "0 9 * * *", cronLabel: "diário 09:00 UTC" },
  { id: "MKT", nome: "Agente Marketing", emoji: "📱", cron: "0 11 * * *", cronLabel: "diário 11:00 UTC" },
  { id: "DAD", nome: "Agente Dados", emoji: "📊", cron: "0 13 * * *", cronLabel: "diário 13:00 UTC" },
  { id: "VID", nome: "Agente Vídeo", emoji: "🎬", cron: null, cronLabel: "manual" },
  { id: "DEV", nome: "Agente Dev", emoji: "🛠️", cron: null, cronLabel: "manual" },
] as const;

export interface AgentStatus {
  id: string;
  nome: string;
  emoji: string;
  cron: string | null;
  cronLabel: string;
  isPaused: boolean;
  ultimaExecucao: string | null;
  ultimoNivel: string | null;
  ultimoResumo: string | null;
  tokensUsed: number | null;
  usdUsed: number | null;
  usdLimit: number | null;
}

export async function GET(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  const agentLogs = req.nextUrl.searchParams.get("logs");
  try {
    if (agentLogs) {
      // últimos 10 logs de um agente (drawer)
      const { data, error } = await supabase
        .from("agent_logs")
        .select("id, level, action, summary, tokens_used, duration_ms, created_at")
        .eq("agent_id", agentLogs)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ logs: data ?? [] });
    }

    const [logsRes, budgetsRes] = await Promise.all([
      supabase
        .from("agent_logs")
        .select("agent_id, level, action, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("agent_budgets").select("agent_id, is_paused, tokens_used, usd_used, usd_limit").limit(50),
    ]);

    const ultimoPorAgente = new Map<string, { level: string; action: string; summary: string | null; created_at: string }>();
    for (const log of logsRes.data ?? []) {
      if (!ultimoPorAgente.has(log.agent_id)) ultimoPorAgente.set(log.agent_id, log);
    }
    const budgetPorAgente = new Map((budgetsRes.data ?? []).map(b => [b.agent_id, b]));

    const agents: AgentStatus[] = CATALOGO.map(a => {
      const log = ultimoPorAgente.get(a.id);
      const budget = budgetPorAgente.get(a.id);
      return {
        id: a.id,
        nome: a.nome,
        emoji: a.emoji,
        cron: a.cron,
        cronLabel: a.cronLabel,
        isPaused: budget?.is_paused ?? false,
        ultimaExecucao: log?.created_at ?? null,
        ultimoNivel: log?.level ?? null,
        ultimoResumo: log?.summary || log?.action || null,
        tokensUsed: budget?.tokens_used ?? null,
        usdUsed: budget?.usd_used != null ? Number(budget.usd_used) : null,
        usdLimit: budget?.usd_limit != null ? Number(budget.usd_limit) : null,
      };
    });

    return NextResponse.json({ agents });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}

// Toggle on/off: flip de agent_budgets.is_paused — o agent-runner já recusa
// execução quando is_paused = true, então o toggle tem efeito real.
export async function POST(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  let body: { agent?: unknown; paused?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const agent = body.agent;
  const paused = body.paused;
  if (typeof agent !== "string" || !CATALOGO.some(a => a.id === agent) || typeof paused !== "boolean") {
    return NextResponse.json({ error: "agent inválido ou paused ausente" }, { status: 400 });
  }

  const { data: existente } = await supabase
    .from("agent_budgets")
    .select("id")
    .eq("agent_id", agent)
    .maybeSingle();

  const campos = {
    is_paused: paused,
    pause_reason: paused ? "Pausado manualmente pelo admin" : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = existente
    ? await supabase.from("agent_budgets").update(campos).eq("agent_id", agent)
    : await supabase.from("agent_budgets").insert({ agent_id: agent, ...campos });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, agent, paused });
}
