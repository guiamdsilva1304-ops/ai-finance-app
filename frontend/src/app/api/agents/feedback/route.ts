import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AGENT_NAMES: Record<string, string> = {
  kai: "Kai (CTO)", lucas: "Lucas (CMO)", maya: "Maya (CPO)",
  pedro: "Pedro (CFO)", ana: "Ana (COO)", julia: "Julia (Head CS)",
};

export async function POST(req: NextRequest) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: feedbacks } = await supabase
      .from("feedback")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: false });

    if (!feedbacks || feedbacks.length === 0) {
      return NextResponse.json({ message: "Nenhum feedback pendente." });
    }

    const results = [];

    for (const feedback of feedbacks) {
      const agent = feedback.assigned_agent || "ana";
      const agentName = AGENT_NAMES[agent] || agent;

      await supabase.from("feedback").update({ status: "analyzing" }).eq("id", feedback.id);

      const systemPrompt = `Você é ${agentName} da iMoney. Recebeu um feedback crítico e precisa:
1. Analisar o problema
2. Se puder resolver automaticamente: FAÇA (ex: SQL, migration, config)
3. Se precisar de código Next.js: gere o código COMPLETO pronto para copiar com caminho do arquivo
4. Salve tudo no banco

CONTEXTO: iMoney fintech, 2 usuários, Next.js 14 + Supabase + Claude Sonnet + Vercel
Problema: ${feedback.content} | Categoria: ${feedback.category} | Prioridade: ${feedback.priority}

Responda em Markdown: ## Diagnóstico ## Ação ## Resultado esperado`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: `Feedback: "${feedback.content}". Analise e aja agora.` }],
      });

      const reply = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      const resolved = ["resolvido","aplicado","corrigido","implementado"].some(w => reply.toLowerCase().includes(w));

      await supabase.from("feedback").update({
        status: resolved ? "resolved" : "in_progress",
        agent_response: reply,
        action_taken: resolved ? "Resolvido automaticamente" : "Indicação gerada pelo agente",
        resolved_at: resolved ? new Date().toISOString() : null,
      }).eq("id", feedback.id);

      await supabase.from("agent_messages").insert({
        from_agent: agent, to_agent: "all", message_type: "alert",
        subject: `Feedback tratado: ${feedback.content.slice(0, 60)}`,
        body: reply.slice(0, 500),
        priority: feedback.priority === "critical" ? "critical" : "high",
        requires_action: !resolved,
      });

      results.push({ feedbackId: feedback.id, agent, resolved, preview: reply.slice(0, 200) });
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ feedbacks: data || [] });
}
