import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Blog de Finanças Pessoais | iMoney",
  description: "Educação financeira prática para jovens brasileiros. Artigos sobre investimentos, dívidas, orçamento e metas financeiras.",
  openGraph: {
    title: "Blog de Finanças Pessoais | iMoney",
    description: "Educação financeira prática para jovens brasileiros.",
    type: "website",
  },
}

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  category: string | null
  tags: string[] | null
  reading_time_min: number | null
  published_at: string | null
  cover_image_url: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  "educacao-financeira": "Educação Financeira",
  "investimentos": "Investimentos",
  "dividas": "Dívidas",
  "planejamento": "Planejamento",
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  "educacao-financeira": { bg: "#dcfce7", color: "#16a34a" },
  "investimentos": { bg: "#dbeafe", color: "#0369a1" },
  "dividas": { bg: "#fee2e2", color: "#dc2626" },
  "planejamento": { bg: "#ede9fe", color: "#7c3aed" },
}

function getEmoji(category: string | null) {
  if (category === "investimentos") return "📈"
  if (category === "dividas") return "💳"
  if (category === "planejamento") return "🗓️"
  return "📚"
}

type Props = { searchParams: Promise<{ cat?: string }> }

export default async function BlogPage({ searchParams }: Props) {
  const { cat } = await searchParams
  const activeFilter = cat && cat !== "todos" ? cat : null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let query = supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, tags, reading_time_min, published_at, cover_image_url")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(50)

  if (activeFilter) query = query.eq("category", activeFilter)

  const { data: posts } = await query

  const filters = [
    ["todos", "Todos"],
    ["educacao-financeira", "📚 Educação"],
    ["investimentos", "📈 Investimentos"],
    ["dividas", "💳 Dívidas"],
    ["planejamento", "🗓️ Planejamento"],
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a3d28, #1D9E75)", padding: "60px 20px", textAlign: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontWeight: 900, fontSize: 28, color: "#fff", marginBottom: 8 }}>🧭 iMoney</div>
        </Link>
        <h1 style={{ fontWeight: 900, fontSize: 40, color: "#fff", margin: "0 0 12px" }}>Blog de Finanças</h1>
        <p style={{ color: "#9FE1CB", fontSize: 18, margin: 0 }}>Educação financeira prática para o brasileiro</p>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
        {/* Filtros — links navegáveis (SSR + SEO friendly) */}
        <nav aria-label="Filtrar por categoria" style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {filters.map(([val, label]) => {
            const isActive = val === "todos" ? !activeFilter : activeFilter === val
            const href = val === "todos" ? "/blog" : `/blog?cat=${val}`
            return (
              <Link
                key={val}
                href={href}
                style={{
                  background: isActive ? "#1D9E75" : "#fff",
                  color: isActive ? "#fff" : "#475569",
                  border: "1px solid #e2e8f0",
                  borderRadius: 20,
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {!posts || posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Nenhum artigo ainda</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Em breve novos conteúdos sobre finanças pessoais</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {(posts as Post[]).map(post => {
              const catStyle = CATEGORY_COLORS[post.category ?? ""] ?? { bg: "#f0fdf4", color: "#1D9E75" }
              return (
                <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                  <article style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
                    {post.cover_image_url ? (
                      <img src={post.cover_image_url} alt={post.title} style={{ width: "100%", height: 180, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: 180, background: "linear-gradient(135deg, #0a3d28, #1D9E75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>
                        {getEmoji(post.category)}
                      </div>
                    )}
                    <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: catStyle.bg, color: catStyle.color, padding: "2px 10px", borderRadius: 20 }}>
                          {CATEGORY_LABELS[post.category ?? ""] ?? post.category ?? "Finanças"}
                        </span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>⏱ {post.reading_time_min ?? 3} min</span>
                        {post.published_at && (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {new Date(post.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", margin: 0, lineHeight: 1.4 }}>{post.title}</h2>
                      {post.excerpt && (
                        <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {post.excerpt}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg, #0a3d28, #1D9E75)", borderRadius: 20, padding: 40, textAlign: "center", marginTop: 60 }}>
          <h2 style={{ fontWeight: 900, fontSize: 24, color: "#fff", margin: "0 0 8px" }}>Coloque em prática o que você aprendeu</h2>
          <p style={{ color: "#9FE1CB", margin: "0 0 24px" }}>Use o assessor IA do iMoney para aplicar esses conceitos nas suas finanças</p>
          <Link href="/login" style={{ background: "#fff", color: "#1D9E75", padding: "14px 32px", borderRadius: 10, textDecoration: "none", fontWeight: 800, fontSize: 15, display: "inline-block" }}>
            Acessar o iMoney gratuitamente →
          </Link>
        </div>
      </div>
    </div>
  )
}
