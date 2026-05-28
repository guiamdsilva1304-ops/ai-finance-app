// /app/api/agents/marketing/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parser robusto que tenta extrair JSON de qualquer formato
function extractJSON(str: string): unknown {
  // Remove markdown code blocks
  let cleaned = str
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  // Tenta parse direto
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Tenta encontrar o primeiro objeto JSON válido na string
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Tenta encontrar array JSON
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1) {
    try {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    } catch {}
  }

  console.error("Não foi possível parsear JSON:", str.slice(0, 200));
  return null;
}

// ─────────────────────────────────────────────
// AGENTE 1: ANALISTA
// ─────────────────────────────────────────────
async function runAnalyst(): Promise<unknown> {
  const [{ data: users }, { data: metas }, { data: posts }] = await Promise.all([
    supabase.from("user_profiles").select("created_at, is_pro").order("created_at", { ascending: false }).limit(30),
    supabase.from("metas").select("categoria, valor_meta, progresso").limit(50),
    supabase.from("admin_posts").select("platform, status, created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  const totalUsers = users?.length ?? 0;
  const proUsers = users?.filter((u: { is_pro: boolean }) => u.is_pro).length ?? 0;
  const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : "0";
  const topCategories = metas
    ? Object.entries(
        metas.reduce((acc: Record<string, number>, m: { categoria: string }) => {
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
    system: `Você é o Analista de Marketing da iMoney, uma fintech brasileira.
Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois.
Estrutura obrigatória:
{"insights":["insight 1","insight 2","insight 3"],"oportunidade_do_dia":"...","tom_recomendado":"..."}`,
    messages: [{ role: "user", content: `Analise e gere insights:\n${context}` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  return extractJSON(text) ?? { insights: ["Usuários buscam controle financeiro", "Metas são o principal engajamento", "Conteúdo educativo converte bem"], oportunidade_do_dia: "Educar sobre planejamento financeiro", tom_recomendado: "próximo e encorajador" };
}

// ─────────────────────────────────────────────
// AGENTE 2: ESTRATEGISTA
// ─────────────────────────────────────────────
async function runStrategist(analystOutput: unknown): Promise<unknown> {
  const dayOfWeek = new Date().toLocaleDateString("pt-BR", { weekday: "long" });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: `Você é o Estrategista de Conteúdo da iMoney.
Brand: fintech brasileira, tom próximo, persona Marina (26 anos, SP).
Pilares SEPC: Sonho, Educação, Plano, Conquista.
Tagline: "Seus sonhos têm um plano. A iMoney cuida dele."

Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois.
Estrutura obrigatória:
{"pauta":{"tema_do_dia":"...","pilar_sepc":"Sonho","hook_principal":"...","tiktok":{"formato":"...","angulo":"...","cta":"..."},"instagram":{"formato":"...","angulo":"...","cta":"..."},"linkedin":{"formato":"...","angulo":"...","cta":"..."}}}`,
    messages: [
      {
        role: "user",
        content: `Hoje é ${dayOfWeek}. Insights:\n${JSON.stringify(analystOutput)}\n\nDefina a pauta.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  return extractJSON(text) ?? { pauta: { tema_do_dia: "Organize suas finanças", pilar_sepc: "Plano", hook_principal: "Você sabe para onde vai o seu dinheiro?", tiktok: { formato: "talking head", angulo: "3 dicas rápidas", cta: "Baixe a iMoney" }, instagram: { formato: "carrossel", angulo: "passo a passo", cta: "Link na bio" }, linkedin: { formato: "post reflexivo", angulo: "produtividade financeira", cta: "Conheça a iMoney" } } };
}

// ─────────────────────────────────────────────
// AGENTE 3: COPYWRITER
// ─────────────────────────────────────────────
async function runCopywriter(strategistOutput: unknown): Promise<unknown> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: `Você é o Copywriter da iMoney. Escreve conteúdo que converte.
Tom: próximo, brasileiro, sem juridiquês. Como uma amiga que entende de dinheiro.
Nunca use: "alavancar", "sinergia", "disruptivo".

Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois.
Estrutura obrigatória:
{"conteudos":{"tiktok":{"script":"roteiro completo","legenda":"legenda com emojis","hashtags":["#tag1","#tag2"]},"instagram":{"caption":"legenda completa","slides":["slide 1","slide 2","slide 3"],"hashtags":["#tag1","#tag2"]},"linkedin":{"post":"post completo","hashtags":["#tag1","#tag2"]}}}`,
    messages: [
      {
        role: "user",
        content: `Pauta:\n${JSON.stringify(strategistOutput)}\n\nEscreva o conteúdo completo.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  return extractJSON(text) ?? { conteudos: { tiktok: { script: "Conteúdo gerado", legenda: "Organize suas finanças com a iMoney", hashtags: ["#financas", "#imoney"] }, instagram: { caption: "Seus sonhos merecem um plano.", slides: ["Slide 1", "Slide 2"], hashtags: ["#financas", "#imoney"] }, linkedin: { post: "Conteúdo LinkedIn gerado.", hashtags: ["#financaspessoais"] } } };
}

// ─────────────────────────────────────────────
// PIPELINE PRINCIPAL
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = req.headers.get("x-cron-secret");

    const isAuthorized =
      cronSecret === process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Marketing Agents] Iniciando pipeline...");

    const analyst = await runAnalyst();
    console.log("[Marketing Agents] Analista concluído");

    const strategist = await runStrategist(analyst);
    console.log("[Marketing Agents] Estrategista concluído");

    const copywriter = await runCopywriter(strategist);
    console.log("[Marketing Agents] Copywriter concluído");

    const pauta = (strategist as { pauta?: { tema_do_dia?: string; pilar_sepc?: string } })?.pauta;
    const conteudos = (copywriter as { conteudos?: Record<string, unknown> })?.conteudos;

    const today = new Date().toISOString().split("T")[0];
    const tema = pauta?.tema_do_dia ?? "Conteúdo do dia";

    const postsToInsert = [
      {
        plataforma: "tiktok",
        titulo: `[TikTok] ${tema}`,
        conteudo: JSON.stringify(conteudos?.tiktok ?? {}),
        status: "pendente",
        metadata: { analista: analyst, estrategista: pauta, data_geracao: today, agente: "marketing-team" },
        // Campos legados da tabela
        platform: "tiktok",
        post: JSON.stringify(conteudos?.tiktok ?? {}),
      },
      {
        plataforma: "instagram",
        titulo: `[Instagram] ${tema}`,
        conteudo: JSON.stringify(conteudos?.instagram ?? {}),
        status: "pendente",
        metadata: { analista: analyst, estrategista: pauta, data_geracao: today, agente: "marketing-team" },
        platform: "instagram",
        post: JSON.stringify(conteudos?.instagram ?? {}),
      },
      {
        plataforma: "linkedin",
        titulo: `[LinkedIn] ${tema}`,
        conteudo: JSON.stringify(conteudos?.linkedin ?? {}),
        status: "pendente",
        metadata: { analista: analyst, estrategista: pauta, data_geracao: today, agente: "marketing-team" },
        platform: "linkedin",
        post: JSON.stringify(conteudos?.linkedin ?? {}),
      },
    ];

    const { data: savedPosts, error: saveError } = await supabase
      .from("admin_posts")
      .insert(postsToInsert)
      .select();

    if (saveError) {
      console.error("[Marketing Agents] Erro ao salvar:", saveError);
      return NextResponse.json({ error: "Erro ao salvar no Supabase", details: saveError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tema_do_dia: tema,
      pilar: pauta?.pilar_sepc,
      posts_gerados: savedPosts?.length ?? 3,
      posts: savedPosts,
    });
  } catch (error) {
    console.error("[Marketing Agents] Erro:", error);
    return NextResponse.json({ error: "Erro interno", details: String(error) }, { status: 500 });
  }
}

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

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await req.json();
  const newStatus = action === "aprovar" ? "aprovado" : "rejeitado";

  const { error } = await supabase
    .from("admin_posts")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status: newStatus });
}
