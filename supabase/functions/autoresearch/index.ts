import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TEST_QUESTIONS = [
  "Tenho R$500 sobrando esse mês. O que faço?",
  "Estou no rotativo do cartão há 3 meses. Como saio disso?",
  "Como montar uma reserva de emergência? Quanto preciso guardar?",
  "Meu score está 450. O que faço para subir rápido?",
  "Vale a pena investir no Tesouro Direto com SELIC a 14,75%?",
];

const PROMPT_VARIANTS = [
  { name: "Baseline", prompt: "Você é um assessor financeiro do iMoney. Seja direto, prático e use dados reais do Brasil. Responda em português brasileiro." },
  { name: "Coach empático", prompt: "Você é assessor do iMoney, como um amigo expert em dinheiro. Nunca use juridiquês. Sempre: 1) reconheça a situação, 2) explique simples, 3) dê 2-3 ações concretas. Máx 3 parágrafos." },
  { name: "Estruturado", prompt: "Você é assessor do iMoney. Responda SEMPRE: 📊 SITUAÇÃO: análise rápida | ✅ AÇÃO #1: mais urgente | ✅ AÇÃO #2: depois | 💡 DICA: dado do mercado BR. Máx 150 palavras." },
  { name: "Ultra direto", prompt: "Você é assessor do iMoney. Seja ULTRA direto. Comece com a resposta principal, depois explique brevemente. Sem introduções. Dados reais do Brasil. Máx 100 palavras." },
];

async function callClaude(system: string, question: string, key: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 200, system, messages: [{ role: "user", content: question }] })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function evaluate(question: string, response: string, key: string) {
  const text = await callClaude(
    "Avaliador. Retorne SOMENTE JSON sem texto extra.",
    `Pergunta: "${question}"\nResposta: "${response.slice(0, 300)}"\nRetorne: {"specificity":0.0,"actionability":0.0,"clarity":0.0}`,
    key
  );
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const s = JSON.parse(match ? match[0] : "{}");
    return { specificity: Number(s.specificity) || 0.5, actionability: Number(s.actionability) || 0.5, clarity: Number(s.clarity) || 0.5 };
  } catch { return { specificity: 0.5, actionability: 0.5, clarity: 0.5 }; }
}

serve(async () => {
  const key = Deno.env.get("ANTHROPIC_API_KEY") || "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

  const { data: experiment } = await supabase.from("experiments").insert({
    name: `AutoResearch v3 — ${PROMPT_VARIANTS.length} prompts × ${TEST_QUESTIONS.length} perguntas`,
    objective: "Otimizar prompt do assessor IA da iMoney",
    metric: "score = (specificity + actionability + clarity) / 3 × 10",
    status: "running",
  }).select().single();

  const results = [];

  for (const variant of PROMPT_VARIANTS) {
    let totalSpec = 0, totalAction = 0, totalClarity = 0;
    let lastQ = "", lastR = "";

    for (const question of TEST_QUESTIONS) {
      const response = await callClaude(variant.prompt, question, key);
      if (!response) continue;
      const scores = await evaluate(question, response, key);
      totalSpec += scores.specificity;
      totalAction += scores.actionability;
      totalClarity += scores.clarity;
      lastQ = question; lastR = response;
    }

    const n = TEST_QUESTIONS.length;
    const score = ((totalSpec + totalAction + totalClarity) / (n * 3)) * 10;

    const { data: v } = await supabase.from("experiment_variants").insert({
      experiment_id: experiment?.id,
      variant_name: variant.name,
      prompt: variant.prompt,
      score,
      tests_run: n,
      avg_specificity_score: totalSpec / n,
      avg_actionability_score: totalAction / n,
      avg_clarity_score: totalClarity / n,
      sample_question: lastQ,
      sample_response: lastR.slice(0, 500),
    }).select().single();

    results.push({ variant: variant.name, score, id: v?.id });
  }

  const best = results.reduce((a, b) => a.score > b.score ? a : b);

  await supabase.from("experiments").update({
    status: "completed",
    best_variant_id: best.id,
    iterations: PROMPT_VARIANTS.length * TEST_QUESTIONS.length,
    completed_at: new Date().toISOString(),
  }).eq("id", experiment?.id);

  await supabase.from("agent_memory").upsert({
    key: "best_assessor_prompt",
    value: PROMPT_VARIANTS.find(v => v.name === best.variant)?.prompt || "",
    updated_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({
    success: true,
    total_tests: PROMPT_VARIANTS.length * TEST_QUESTIONS.length,
    best_variant: best.variant,
    best_score: best.score.toFixed(2),
    ranking: results.sort((a, b) => b.score - a.score).map(r => ({ variant: r.variant, score: r.score.toFixed(2) })),
  }), { headers: { "Content-Type": "application/json" } });
});
