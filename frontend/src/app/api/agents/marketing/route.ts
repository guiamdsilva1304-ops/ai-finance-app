// /app/api/agents/marketing/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────
// AGENTE 1: ANALISTA
// Lê métricas do Supabase e gera insights
// ─────────────────────────────────────────────
async function runAnalyst(): Promise<string> {
  // Busca dados reais do Supabase
  const [{ data: users }, { data: metas }, { data: posts }] = await Promise.all([
    supabase.from("user_profiles").select("created_at, is_pro").order("created_at", { ascending: false }).limit(30),
    supabase.from("metas").select("categoria, valor_meta, progresso").limit(50),
    supabase.from("admin_posts").select("plataforma, status, created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  const totalUsers = users?.length ?? 0;
  const proUsers = users?.filter((u) => u.is_pro).length ?? 0;
  const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : "0";
  const topCategories = metas
    ? Object.entries(
        metas.reduce((acc: Record<string, number>, m) => {
          acc[m.categoria] = (acc[m.categoria] ?? 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat)
    : [];

  const context = `
Métricas iMoney (últimos dados):
- Total de usuários: ${totalUsers}
- Usuários Pro: ${proUsers} (${conversionRate}% de conversão)
- Top categorias de metas: ${topCategories.join(", ") || "Viagem, Emergência, Aposentadoria"}
- Posts publicados recentemente: ${posts?.length ?? 0}
- Data de hoje: ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: `Você é o Analista de Marketing da iMoney, uma fintech brasileira que ajuda pessoas a transformar sonhos financeiros em metas concretas.
Sua missão: analisar métricas e gerar 3-5 insights acionáveis que guiarão o conteúdo do dia.
Seja direto, use dados, identifique oportunidades de conteúdo com base no comportamento dos usuários.
Responda em JSON com a estrutura: { "insights": ["...", "..."], "oportunidade_do_dia": "...", "tom_recomendado": "..." }`,
    messages: [{ role: "user", content: `Analise estes dados e gere insights para o time de conteúdo:\n${context}` }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "{}";
}

// ─────────────────────────────────────────────
// AGENTE 2: ESTRATEGISTA
// Recebe insights e define a pauta do dia
// ─────────────────────────────────────────────
async function runStrategist(analystOutput: string): Promise<string> {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString("pt-BR", { weekday: "long" });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: `Você é o Estrategista de Conteúdo da iMoney.
Brand: fintech brasileira, tom próximo e encorajador, persona Marina (26 anos, analista de marketing, SP).
Pilares SEPC: Sonho, Educação, Plano, Conquista.
Visual: #1a3a1a / #00C853 / branco, Nunito.
Tagline: "Seus sonhos têm um plano. A iMoney cuida dele."

Sua missão: com base nos insights do Analista, definir a pauta do dia para 3 plataformas.
Considere o dia da semana para o formato ideal.

Responda SOMENTE em JSON válido, sem markdown, sem explicações:
{
  "pauta": {
    "tema_do_dia": "...",
    "pilar_sepc": "Sonho|Educação|Plano|Conquista",
    "hook_principal": "...",
    "tiktok": { "formato": "...", "angulo": "...", "cta": "..." },
    "instagram": { "formato": "...", "angulo": "...", "cta": "..." },
    "linkedin": { "formato": "...", "angulo": "...", "cta": "..." }
  }
}`,
    messages: [
      {
        role: "user",
        content: `Hoje é ${dayOfWeek}. Insights do Analista:\n${analystOutput}\n\nDefina a pauta do dia.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "{}";
}

// ─────────────────────────────────────────────
// AGENTE 3: COPYWRITER
// Recebe pauta e escreve os 3 conteúdos
// ─────────────────────────────────────────────
async function runCopywriter(strategistOutput: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: `Você é o Copywriter da iMoney. Escreve conteúdo que converte.
Tom: próximo, brasileiro, sem juridiquês financeiro. Como uma amiga que entende de dinheiro.
Nunca use: "alavancar", "sinergia", "disruptivo".
Use: linguagem do cotidiano, emojis com moderação, storytelling curto.

Escreva o conteúdo COMPLETO para cada plataforma com base na pauta recebida.

Responda SOMENTE em JSON válido, sem markdown:
{
  "conteudos": {
    "tiktok": {
      "script": "roteiro completo em bullet points de fala",
      "legenda": "legenda com emojis e hashtags",
      "hashtags": ["#...", "#..."]
    },
    "instagram": {
      "caption": "legenda completa para o post/carrossel",
      "slides": ["texto slide 1", "texto slide 2", "..."],
      "hashtags": ["#...", "#..."]
    },
    "linkedin": {
      "post": "post completo para LinkedIn, tom mais profissional mas ainda humano",
      "hashtags": ["#...", "#..."]
    }
  }
}`,
    messages: [
      {
        role: "user",
        content: `Pauta definida pelo Estrategista:\n${strategistOutput}\n\nEscreva o conteúdo completo para as 3 plataformas.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "{}";
}

// ─────────────────────────────────────────────
// PIPELINE PRINCIPAL
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Verifica cron secret ou auth de admin
    const authHeader = req.headers.get("authorization");
    const cronSecret = req.headers.get("x-cron-secret");

    const isAuthorized =
      cronSecret === process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Marketing Agents] Iniciando pipeline...");

    // Step 1: Analista
    console.log("[Marketing Agents] Rodando Analista...");
    const analystOutput = await runAnalyst();

    // Step 2: Estrategista
    console.log("[Marketing Agents] Rodando Estrategista...");
    const strategistOutput = await runStrategist(analystOutput);

    // Step 3: Copywriter
    console.log("[Marketing Agents] Rodando Copywriter...");
    const copywriterOutput = await runCopywriter(strategistOutput);

    // Parse dos outputs
    const cleanJson = (str: string) =>
      str.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let analyst, strategist, copywriter;
    try {
      analyst = JSON.parse(cleanJson(analystOutput));
      strategist = JSON.parse(cleanJson(strategistOutput));
      copywriter = JSON.parse(cleanJson(copywriterOutput));
    } catch (e) {
      console.error("[Marketing Agents] Erro ao parsear JSON:", e);
      return NextResponse.json({ error: "Erro ao parsear output dos agentes" }, { status: 500 });
    }

    // Salva no Supabase com status "pendente" (aguarda revisão)
    const today = new Date().toISOString().split("T")[0];
    const tema = strategist?.pauta?.tema_do_dia ?? "Conteúdo do dia";

    const postsToInsert = [
      {
        plataforma: "tiktok",
        titulo: `[TikTok] ${tema}`,
        conteudo: JSON.stringify(copywriter?.conteudos?.tiktok ?? {}),
        status: "pendente",
        metadata: {
          analista: analyst,
          estrategista: strategist?.pauta,
          data_geracao: today,
          agente: "marketing-team",
        },
      },
      {
        plataforma: "instagram",
        titulo: `[Instagram] ${tema}`,
        conteudo: JSON.stringify(copywriter?.conteudos?.instagram ?? {}),
        status: "pendente",
        metadata: {
          analista: analyst,
          estrategista: strategist?.pauta,
          data_geracao: today,
          agente: "marketing-team",
        },
      },
      {
        plataforma: "linkedin",
        titulo: `[LinkedIn] ${tema}`,
        conteudo: JSON.stringify(copywriter?.conteudos?.linkedin ?? {}),
        status: "pendente",
        metadata: {
          analista: analyst,
          estrategista: strategist?.pauta,
          data_geracao: today,
          agente: "marketing-team",
        },
      },
    ];

    const { data: savedPosts, error: saveError } = await supabase
      .from("admin_posts")
      .insert(postsToInsert)
      .select();

    if (saveError) {
      console.error("[Marketing Agents] Erro ao salvar posts:", saveError);
      return NextResponse.json({ error: "Erro ao salvar no Supabase" }, { status: 500 });
    }

    console.log("[Marketing Agents] Pipeline concluído com sucesso!");

    return NextResponse.json({
      success: true,
      tema_do_dia: tema,
      pilar: strategist?.pauta?.pilar_sepc,
      posts_gerados: savedPosts?.length ?? 3,
      posts: savedPosts,
      pipeline: {
        analista: analyst,
        estrategista: strategist?.pauta,
        conteudos: copywriter?.conteudos,
      },
    });
  } catch (error) {
    console.error("[Marketing Agents] Erro no pipeline:", error);
    return NextResponse.json({ error: "Erro interno no pipeline" }, { status: 500 });
  }
}

// GET: retorna posts pendentes de revisão
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: posts, error } = await supabase
    .from("admin_posts")
    .select("*")
    .eq("status", "pendente")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ posts });
}

// PATCH: aprova ou rejeita um post
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await req.json(); // action: "aprovar" | "rejeitar"
  const newStatus = action === "aprovar" ? "aprovado" : "rejeitado";

  const { error } = await supabase
    .from("admin_posts")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, status: newStatus });
}
