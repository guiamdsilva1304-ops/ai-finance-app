import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ESTRATEGIA_SEMANAL: Record<number, { tipo: string; tema: string; formato: string }> = {
  0: { tipo: "carrossel", tema: "planejamento financeiro semanal e metas de dinheiro", formato: "5 slides motivacionais com dicas práticas para a semana" },
  1: { tipo: "carrossel", tema: "conceito financeiro essencial: reserva de emergência, SELIC, inflação, juros compostos ou investimentos", formato: "5-6 slides educativos estilo 'o que você precisa saber sobre X'" },
  2: { tipo: "single_post", tema: "dado chocante sobre finanças do brasileiro: endividamento, rotativo do cartão, salário mínimo, FGTS", formato: "Post direto com dado real gigante e contexto impactante" },
  3: { tipo: "single_post", tema: "verdade inconveniente ou frase impactante sobre dinheiro e finanças pessoais", formato: "Post direto com frase grande e dado real do Brasil" },
  4: { tipo: "carrossel", tema: "tutorial passo a passo: como montar orçamento, sair das dívidas ou começar a investir", formato: "6-7 slides com passos numerados e práticos" },
  5: { tipo: "carrossel", tema: "comparativo financeiro: poupança vs investimento, aluguel vs compra, gastar vs guardar", formato: "5 slides comparando opções com dados reais" },
  6: { tipo: "single_post", tema: "erro financeiro comum que todo brasileiro comete: poupança como investimento, parcelamento, rotativo", formato: "Post impactante com dado real e chamada para ação" },
};

const DIAS_PT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from("content_pipeline")
      .select("*")
      .order("scheduled_for", { ascending: true });
    return NextResponse.json({ posts: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return NextResponse.json({ error: "ANTHROPIC_API_KEY ausente" }, { status: 500 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Estratégia do dia — com override manual opcional
    const diaSemana = body.dia_semana ?? new Date().getDay();
    const estrategia = ESTRATEGIA_SEMANAL[diaSemana] || ESTRATEGIA_SEMANAL[1];
    const diaStr = DIAS_PT[diaSemana];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `Você é Lucas, CMO da iMoney — fintech brasileira de IA financeira pessoal. Público: brasileiros 25-40 anos. Tom: direto, provocativo, baseado em dados reais (SELIC, IBGE, endividamento). Retorne SOMENTE JSON válido sem markdown e sem backticks.

REGRA DE FORMATO:
- Use "carrossel" quando o tema tiver múltiplos passos, lista de itens, comparativos ou explicações sequenciais (ex: "5 erros", "como fazer X em Y passos", "diferença entre A e B")
- Use "single_post" quando o tema tiver 1 dado chocante, 1 frase impactante ou 1 insight rápido (ex: "X% dos brasileiros...", "Você sabia que...", frases de impacto)`,
        messages: [{
          role: "user",
          content: `Hoje é ${diaStr}. Crie 1 post para Instagram da iMoney seguindo esta estratégia:

FORMATO: ${estrategia.tipo}
TEMA GUIA: ${estrategia.tema}
ESTILO: ${estrategia.formato}

Seja criativo — escolha um ângulo específico dentro do tema, use dados reais do Brasil, seja provocativo e relevante para o público brasileiro de 25-40 anos.

Retorne SOMENTE este JSON (sem markdown, sem backticks, sem explicações):
[{"content_type":"${estrategia.tipo}","tema":"tema específico escolhido","angulo":"ângulo criativo do post","caption":"caption com emojis máx 150 chars","hashtags":["hashtag1","hashtag2","hashtag3","hashtag4"],"cta":"call to action específico","melhor_horario":"18h-20h","visual_description":"descrição detalhada do visual para DALL-E 3: fundo branco, texto em verde escuro bold gigante, ícones 3D verdes flutuando, logo iMoney no canto inferior direito","dias_a_partir_de_hoje":0,"slides":[]}]

${estrategia.tipo === "carrossel" ? `IMPORTANTE: preencha "slides" com ${estrategia.tipo === "carrossel" ? "5-6" : "0"} objetos: [{"texto":"TEXTO EM MAIUSCULAS MAX 8 PALAVRAS","visual_description":"visual específico deste slide"}]` : 'Deixe "slides" como array vazio [].'}`
        }]
      })
    });

    const resText = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: `Anthropic ${res.status}: ${resText.slice(0, 200)}` }, { status: 500 });
    }

    const data = JSON.parse(resText);
    const text = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";

    let posts;
    try {
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const clean = jsonMatch ? jsonMatch[0] : text.replace(/```json|```/g, "").trim();
      posts = JSON.parse(clean);
      if (!Array.isArray(posts)) posts = [posts];
    } catch {
      return NextResponse.json({ error: "JSON invalido", raw: text.slice(0, 500) }, { status: 500 });
    }

    const today = new Date();
    const inserts = posts.map((p: any, i: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (p.dias_a_partir_de_hoje || i));
      return {
        platform: "instagram",
        content_type: p.content_type || estrategia.tipo,
        tema: p.tema || "Finanças",
        angulo: p.angulo || "",
        caption: p.caption || "",
        hashtags: p.hashtags || [],
        cta: p.cta || "",
        melhor_horario: p.melhor_horario || "18h-20h",
        visual_description: p.visual_description || "",
        slides: p.slides || [],
        slides_count: p.slides?.length || 1,
        scheduled_for: d.toISOString().split("T")[0],
        status: "aguardando_aprovacao",
        image_status: "pending",
      };
    });

    const { data: saved, error } = await supabase.from("content_pipeline").insert(inserts).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, generated: inserts.length, estrategia: estrategia.tipo, dia: diaStr, posts: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
