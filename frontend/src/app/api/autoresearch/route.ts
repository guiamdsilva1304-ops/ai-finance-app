import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Perguntas de teste representativas de usuarios reais
const TEST_QUESTIONS = [
  "Tenho R$500 sobrando esse mês. O que faço com esse dinheiro?",
  "Estou no rotativo do cartão há 3 meses. Como saio disso?",
  "Vale a pena investir no Tesouro Direto com a SELIC a 14,75%?",
  "Como montar uma reserva de emergência? Quanto preciso guardar?",
  "Meu score está 450. O que faço para subir rápido?",
];

// Variantes do prompt do assessor a testar
const PROMPT_VARIANTS = [
  {
    name: "Baseline — prompt atual",
    prompt: `Você é um assessor financeiro pessoal do iMoney, focado em ajudar brasileiros a melhorarem sua vida financeira. Seja direto, prático e use dados reais do Brasil quando relevante. Responda sempre em português brasileiro.`
  },
  {
    name: "Contextual — com dados BR",
    prompt: `Você é o assessor financeiro do iMoney. Contexto do Brasil em 2026: SELIC 14,75%, inflação ~5%, 70% dos brasileiros endividados, salário mínimo R$1.518. Use esses dados para contextualizar suas respostas. Seja direto e prático. Dê sempre um próximo passo concreto que o usuário pode fazer hoje.`
  },
  {
    name: "Coach — empático e acionável",
    prompt: `Você é o assessor financeiro do iMoney, como um amigo que entende muito de dinheiro. Nunca use juridiquês. Sempre: 1) reconheça a situação do usuário, 2) explique de forma simples, 3) dê 2-3 ações concretas ordenadas por prioridade. Use dados reais do Brasil. Máximo 3 parágrafos.`
  },
  {
    name: "Estruturado — formato fixo",
    prompt: `Você é assessor financeiro do iMoney. Para cada pergunta, responda SEMPRE neste formato:
📊 SITUAÇÃO: análise rápida do contexto
✅ AÇÃO #1: o que fazer primeiro (mais urgente)
✅ AÇÃO #2: o que fazer depois
💡 DICA EXTRA: dado ou insight relevante do mercado brasileiro
Seja direto. Máximo 150 palavras.`
  },
  {
    name: "Personalizado — baseado em dados",
    prompt: `Você é o assessor de IA do iMoney com acesso aos dados financeiros do usuário. Quando o usuário perguntar algo, use o contexto das transações e metas dele se disponível. Se não houver dados, pergunte brevemente para personalizar. SELIC atual: 14,75%. Sempre termine com uma pergunta que aprofunda o entendimento da situação do usuário.`
  },
];

// Avalia a qualidade de uma resposta (0-1 em cada dimensão)
async function evaluateResponse(question: string, response: string, key: string): Promise<{specificity: number, actionability: number, clarity: number}> {
  const evalRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: "Você é um avaliador de qualidade de respostas financeiras. Retorne SOMENTE JSON.",
      messages: [{
        role: "user",
        content: `Avalie esta resposta de assessor financeiro para um brasileiro.

Pergunta: "${question}"
Resposta: "${response}"

Retorne SOMENTE este JSON com scores de 0.0 a 1.0:
{
  "specificity": 0.0,
  "actionability": 0.0,  
  "clarity": 0.0
}

Critérios:
- specificity: quão específica ao contexto brasileiro (menciona dados reais, SELIC, valores em R$)
- actionability: quão acionável (dá passos concretos que o usuário pode fazer hoje)
- clarity: quão clara e direta (sem juridiquês, fácil de entender)`
      }]
    })
  });

  const evalData = await evalRes.json();
  const text = evalData.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";
  
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const scores = JSON.parse(match ? match[0] : "{}");
    return {
      specificity: Math.min(1, Math.max(0, scores.specificity || 0)),
      actionability: Math.min(1, Math.max(0, scores.actionability || 0)),
      clarity: Math.min(1, Math.max(0, scores.clarity || 0)),
    };
  } catch {
    return { specificity: 0.5, actionability: 0.5, clarity: 0.5 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const key = process.env.ANTHROPIC_API_KEY!;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Cria o experimento
    const { data: experiment } = await supabase.from("experiments").insert({
      name: "AutoResearch — Otimização do Prompt do Assessor",
      objective: "Encontrar o prompt que gera respostas de maior qualidade para usuários brasileiros",
      metric: "score = (specificity + actionability + clarity) / 3",
      status: "running",
    }).select().single();

    if (!experiment) throw new Error("Erro ao criar experimento");

    const results = [];

    // Testa cada variante com cada pergunta
    for (const variant of PROMPT_VARIANTS) {
      let totalSpecificity = 0, totalActionability = 0, totalClarity = 0;
      let lastQuestion = "", lastResponse = "";

      for (const question of TEST_QUESTIONS) {
        // Gera resposta com esse prompt
        const chatRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 400,
            system: variant.prompt,
            messages: [{ role: "user", content: question }]
          })
        });

        const chatData = await chatRes.json();
        const response = chatData.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";

        // Avalia a resposta
        const scores = await evaluateResponse(question, response, key);
        totalSpecificity += scores.specificity;
        totalActionability += scores.actionability;
        totalClarity += scores.clarity;
        lastQuestion = question;
        lastResponse = response;
      }

      const n = TEST_QUESTIONS.length;
      const avgSpec = totalSpecificity / n;
      const avgAction = totalActionability / n;
      const avgClarity = totalClarity / n;
      const finalScore = ((avgSpec + avgAction + avgClarity) / 3) * 10; // 0-10

      // Salva variante no banco
      const { data: savedVariant } = await supabase.from("experiment_variants").insert({
        experiment_id: experiment.id,
        variant_name: variant.name,
        prompt: variant.prompt,
        score: finalScore,
        tests_run: n,
        avg_specificity_score: avgSpec,
        avg_actionability_score: avgAction,
        avg_clarity_score: avgClarity,
        sample_question: lastQuestion,
        sample_response: lastResponse.slice(0, 500),
      }).select().single();

      results.push({ variant: variant.name, score: finalScore, savedVariant });
    }

    // Encontra o melhor prompt
    const best = results.reduce((a, b) => a.score > b.score ? a : b);

    // Atualiza experimento com o melhor resultado
    await supabase.from("experiments").update({
      status: "completed",
      best_variant_id: best.savedVariant?.id,
      iterations: PROMPT_VARIANTS.length * TEST_QUESTIONS.length,
      completed_at: new Date().toISOString(),
    }).eq("id", experiment.id);

    // Salva o melhor prompt na agent_memory para o Kai usar
    await supabase.from("agent_memory").upsert({
      key: "best_assessor_prompt",
      value: PROMPT_VARIANTS.find(v => v.name === best.variant)?.prompt || "",
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      experiment_id: experiment.id,
      iterations: PROMPT_VARIANTS.length * TEST_QUESTIONS.length,
      best_variant: best.variant,
      best_score: best.score.toFixed(2),
      ranking: results.sort((a, b) => b.score - a.score).map(r => ({
        variant: r.variant,
        score: r.score.toFixed(2),
      })),
    });

  } catch (err: any) {
    console.error("AutoResearch error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: experiments } = await supabase
    .from("experiments")
    .select("*, experiment_variants(*)")
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({ experiments: experiments || [] });
}
