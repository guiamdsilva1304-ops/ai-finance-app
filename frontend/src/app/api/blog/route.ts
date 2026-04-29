import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TEMAS = [
  { categoria: "educacao-financeira", titulo: "Como montar uma reserva de emergência do zero", keywords: "reserva de emergência, quanto guardar, onde investir reserva" },
  { categoria: "dividas", titulo: "Como sair do rotativo do cartão de crédito", keywords: "rotativo cartão, juros cartão, como pagar dívida cartão" },
  { categoria: "investimentos", titulo: "Tesouro Direto vs Poupança: qual rende mais em 2026", keywords: "tesouro direto, poupança, onde investir, SELIC" },
  { categoria: "planejamento", titulo: "Como fazer um orçamento mensal que funciona de verdade", keywords: "orçamento mensal, controle de gastos, planilha financeira" },
  { categoria: "educacao-financeira", titulo: "O que é SELIC e como ela afeta seu dinheiro", keywords: "SELIC, taxa de juros, banco central, investimentos" },
  { categoria: "dividas", titulo: "Score de crédito: como aumentar seu Serasa em 90 dias", keywords: "score serasa, crédito, score baixo, como aumentar score" },
  { categoria: "investimentos", titulo: "CDB, LCI, LCA: qual a diferença e qual escolher", keywords: "CDB, LCI, LCA, renda fixa, investimentos seguros" },
  { categoria: "planejamento", titulo: "Regra 50-30-20: o método mais simples para controlar gastos", keywords: "regra 50 30 20, método financeiro, controle gastos" },
];

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, tags, reading_time_min, published, published_at, cover_image_url, created_at")
    .order("created_at", { ascending: false });
  return NextResponse.json({ posts: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const temaIndex = body.tema_index ?? Math.floor(Math.random() * TEMAS.length);
    const tema = TEMAS[temaIndex % TEMAS.length];

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const key = process.env.ANTHROPIC_API_KEY!;
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
        system: `Você é um especialista em finanças pessoais brasileiras escrevendo para o blog do iMoney. 
Escreva artigos práticos, diretos e baseados em dados reais do Brasil.
Tom: empático, sem juridiquês, como um amigo que entende de dinheiro.
Retorne SOMENTE JSON válido sem markdown.`,
        messages: [{
          role: "user",
          content: `Escreva um artigo completo para o blog do iMoney sobre: "${tema.titulo}"

Retorne SOMENTE este JSON:
{
  "title": "${tema.titulo}",
  "excerpt": "resumo de 2 frases para SEO (máx 160 chars)",
  "content": "artigo completo em HTML (use <h2>, <p>, <ul>, <li>, <strong>) com pelo menos 600 palavras. Inclua dados reais do Brasil. No final inclua CTA para usar o iMoney.",
  "slug": "slug-url-amigavel",
  "tags": ["tag1", "tag2", "tag3"],
  "seo_title": "título SEO otimizado (máx 60 chars)",
  "seo_description": "descrição SEO (máx 160 chars)",
  "reading_time_min": 5
}`
        }]
      })
    });

    const data = await res.json();
    const text = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";
    
    let article;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      article = JSON.parse(match ? match[0] : text);
    } catch {
      return NextResponse.json({ error: "JSON inválido", raw: text.slice(0, 300) }, { status: 500 });
    }

    const { data: saved, error } = await supabase.from("blog_posts").insert({
      ...article,
      category: tema.categoria,
      published: false,
      generated_by: "lucas",
    }).select().single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, post: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
