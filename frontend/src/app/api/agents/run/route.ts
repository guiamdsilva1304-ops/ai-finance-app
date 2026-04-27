import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMONEY_CONTEXT = `
EMPRESA: iMoney — fintech brasileira de IA financeira pessoal
FUNDADOR: Gui Moreira
ESTADO: 2 usuários, 7 transações, 12 chats, 6 metas
TABELAS: user_profiles, transactions, metas, chat_history, user_investments, email_queue, admin_posts, agent_jobs, agent_runs, agent_messages, agent_memory
FASE: Early stage. Foco em crescimento e retenção.
MONETIZAÇÃO: Freemium → iMoney Pro R$29/mês → B2B contadores/corretoras
CONCORRENTES: Organizze, Mobills, GuiaBolso
DIFERENCIAL: IA real com dados financeiros pessoais + Open Finance + taxas BCB em tempo real
`;

const AGENT_PROMPTS: Record<string, string> = {
  ana: `Você é Ana, COO da iMoney. ${IMONEY_CONTEXT} Execute o briefing executivo. Analise o estado da empresa e retorne um briefing em Markdown com: Saúde Geral, Números do Dia, Alertas Críticos e Prioridade #1.`,
  kai: `Você é Kai, CTO da iMoney. ${IMONEY_CONTEXT} Execute o diagnóstico técnico. Analise riscos, bugs (especialmente user_memory 406) e retorne diagnóstico em Markdown com: Status, Problemas, Fixes.`,
  lucas: `Você é Lucas, CMO da iMoney. ${IMONEY_CONTEXT} Crie um post para LinkedIn usando dados reais da iMoney. Tom provocativo e data-driven. Retorne post pronto com hashtags e CTA.`,
  pedro: `Você é Pedro, CFO da iMoney. ${IMONEY_CONTEXT} Calcule unit economics reais: custo API (12 chats x $0.008), custo por usuário, MRR atual (R$0), MRR potencial (5% conversão Pro). Retorne relatório financeiro em Markdown.`,
  maya: `Você é Maya, CPO da iMoney. ${IMONEY_CONTEXT} Analise o produto: feature mais usada, maior bloqueio de retenção, próxima feature de maior impacto. Retorne análise de produto em Markdown.`,
  julia: `Você é Julia, Head CS da iMoney. ${IMONEY_CONTEXT} Analise os usuários: 2 cadastros, 0 emails enviados. Crie email de boas-vindas e estratégia de reativação. Retorne textos prontos para usar.`,
  orchestrator: `Você é o Orquestrador Multi-Agent da iMoney. ${IMONEY_CONTEXT} Coordene Ana, Kai, Lucas, Pedro, Maya e Julia. Para cada objetivo, divida em tarefas, execute mentalmente cada agente e consolide os resultados de forma estruturada.`,
};

export async function POST(req: NextRequest) {
  try {
    const { agentId, messages, saveResult } = await req.json();

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const systemPrompt = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.orchestrator;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    });

    const reply = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("") || "";

    if (saveResult && reply) {
      const typeMap: Record<string, string> = {
        ana: "briefing", kai: "diagnostico-tecnico", lucas: "post-linkedin",
        pedro: "relatorio-financeiro", maya: "analise-produto", julia: "email-template",
      };
      const platformMap: Record<string, string> = {
        ana: "interno", kai: "interno", lucas: "linkedin",
        pedro: "interno", maya: "interno", julia: "interno",
      };

      await Promise.all([
        supabase.from("admin_posts").insert({
          platform: platformMap[agentId] || "interno",
          format: typeMap[agentId] || "relatorio",
          tone: "executivo", audience: "fundador", theme: agentId,
          aesthetic: "data-driven", post: reply,
          hashtags: ["imoney", agentId], cta: "Revisar e agir",
          melhor_horario: "08:00",
          gancho: reply.split("\n")[0]?.slice(0, 100) || "",
          insight: `Agente ${agentId} — ${new Date().toLocaleDateString("pt-BR")}`,
          used: false,
        }),
        supabase.from("agent_messages").insert({
          from_agent: agentId, to_agent: "all",
          message_type: "response",
          subject: `${agentId.toUpperCase()} — ${typeMap[agentId] || "relatório"} concluído`,
          body: reply.slice(0, 500),
          priority: agentId === "kai" ? "high" : "normal",
          requires_action: false,
        }),
        supabase.from("agent_jobs").update({
          last_run_at: new Date().toISOString(),
          status: "completed",
          result_summary: reply.slice(0, 200),
          updated_at: new Date().toISOString(),
        }).eq("agent_id", agentId),
      ]);
    }

    return NextResponse.json({ content: [{ type: "text", text: reply }] });
  } catch (err: any) {
    console.error("Agent run error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
