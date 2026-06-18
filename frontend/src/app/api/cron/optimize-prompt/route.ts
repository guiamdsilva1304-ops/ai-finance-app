import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

const MIN_NEGATIVE_FEEDBACKS = 5;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: negativeFeedbacks, error: feedbackError } = await supabase
      .from("assessor_feedback")
      .select("message, response, context, created_at")
      .eq("rating", false)
      .gte("created_at", seteDiasAtras)
      .order("created_at", { ascending: false })
      .limit(50);

    if (feedbackError) throw feedbackError;

    const count = negativeFeedbacks?.length ?? 0;
    if (count < MIN_NEGATIVE_FEEDBACKS) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `Apenas ${count} feedbacks negativos nos últimos 7 dias (mínimo: ${MIN_NEGATIVE_FEEDBACKS})`,
      });
    }

    const { data: activePrompt, error: promptError } = await supabase
      .from("assessor_prompts")
      .select("id, version, base_prompt, behavior_rules")
      .eq("is_active", true)
      .maybeSingle();

    if (promptError) throw promptError;

    const currentBase = activePrompt?.base_prompt ?? "Assessor financeiro iMoney — parceiro próximo, direto, humano.";
    const currentRules = activePrompt?.behavior_rules ?? "";
    const nextVersion = (activePrompt?.version ?? 0) + 1;

    const feedbackList = negativeFeedbacks!
      .map((f, i) =>
        `--- Feedback ${i + 1} ---\nPergunta do usuário: ${f.message}\nResposta do assessor: ${f.response}`
      )
      .join("\n\n");

    const optimizationPrompt = `Você é um especialista em otimização de prompts para assistentes de IA financeira.

CONTEXTO DO SISTEMA:
${currentBase}

REGRAS DE COMPORTAMENTO ATUAIS:
${currentRules || "(nenhuma regra adicional definida ainda)"}

FEEDBACKS NEGATIVOS DOS ÚLTIMOS 7 DIAS (${count} no total):
${feedbackList}

TAREFA:
Analise os padrões nos feedbacks negativos e reescreva as REGRAS DE COMPORTAMENTO ADICIONAIS para corrigir os problemas identificados.

INSTRUÇÕES:
- Identifique os padrões que geraram insatisfação (tom, conteúdo, formato, etc.)
- Escreva regras específicas e acionáveis para evitar esses problemas
- Mantenha regras que estavam funcionando
- Máximo 10 regras, cada uma em uma linha começando com "-"
- Escreva em português, de forma concisa e direta
- NÃO explique sua análise — retorne APENAS as regras, sem cabeçalhos ou introduções

Exemplo de formato:
- Nunca sugira valores de investimento acima de 30% da renda sem o usuário pedir
- Quando o usuário registrar um gasto, sempre compare com o padrão do mês atual
- Evite linguagem técnica de investimentos (ex: "diversificação de portfólio") — use linguagem simples`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: optimizationPrompt }],
    });

    const newBehaviorRules = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (!newBehaviorRules) {
      return NextResponse.json({ ok: false, error: "Otimizador não retornou regras" }, { status: 500 });
    }

    // Desativa o prompt atual
    if (activePrompt?.id) {
      await supabase
        .from("assessor_prompts")
        .update({ is_active: false })
        .eq("id", activePrompt.id);
    }

    // Insere nova versão como ativa
    const { error: insertError } = await supabase.from("assessor_prompts").insert({
      version: nextVersion,
      base_prompt: currentBase,
      behavior_rules: newBehaviorRules,
      is_active: true,
      generated_by: "cron-optimize",
    });

    if (insertError) throw insertError;

    console.log(`[optimize-prompt] Nova versão ${nextVersion} criada com base em ${count} feedbacks negativos`);

    return NextResponse.json({
      ok: true,
      version: nextVersion,
      negative_feedbacks_analyzed: count,
      new_rules_preview: newBehaviorRules.slice(0, 200),
    });
  } catch (err: unknown) {
    console.error("[optimize-prompt] Erro:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
