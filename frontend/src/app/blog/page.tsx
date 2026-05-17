import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"
import { MarketingNavBar, Footer } from "@/components/imoney/marketing"
import { C, FONT } from "@/components/imoney/tokens"

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
  reading_time_min: number | null
  published_at: string | null
  cover_image_url: string | null
}

const CATEGORIES: Array<[string, string, string]> = [
  ["todos",                 "Todos",          "📚"],
  ["educacao-financeira",   "Educação",       "📚"],
  ["investimentos",         "Investimentos",  "📈"],
  ["dividas",               "Dívidas",        "💳"],
  ["planejamento",          "Planejamento",   "🗓️"],
]

function getEmoji(category: string | null): string {
  const found = CATEGORIES.find(([val]) => val === category)
  return found ? found[2] : "📚"
}

function getCategoryLabel(category: string | null): string {
  const found = CATEGORIES.find(([val]) => val === category)
  return found ? found[1] : (category ?? "Finanças")
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
    .select("id, slug, title, excerpt, category, reading_time_min, published_at, cover_image_url")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(50)

  if (activeFilter) query = query.eq("category", activeFilter)

  const { data: posts } = await query

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FONT }}>
      <MarketingNavBar />

      {/* Hero */}
      <section style={{
        background: C.green900, padding: "72px 32px 80px", textAlign: "center",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(0,200,83,0.15)", color: C.green500,
            fontWeight: 800, fontSize: 12, letterSpacing: "0.12em",
            textTransform: "uppercase", padding: "6px 14px",
            borderRadius: 999, marginBottom: 20,
          }}>
            Do blog iMoney
          </div>
          <h1 style={{
            fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: "#fff",
            letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 16px",
          }}>
            Aprenda enquanto sua meta cresce
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.6 }}>
            Educação financeira prática para jovens brasileiros — sem jargão, sem enrolação.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px 80px" }}>

        {/* Filtros */}
        <nav aria-label="Filtrar por categoria" style={{
          display: "flex", gap: 8, marginBottom: 40, flexWrap: "wrap",
        }}>
          {CATEGORIES.map(([val, label, emoji]) => {
            const isActive = val === "todos" ? !activeFilter : activeFilter === val
            const href = val === "todos" ? "/blog" : `/blog?cat=${val}`
            return (
              <Link
                key={val}
                href={href}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: isActive ? C.green500 : "#fff",
                  color: isActive ? C.green900 : C.ink2,
                  border: `1.5px solid ${isActive ? C.green500 : C.divider}`,
                  borderRadius: 999, padding: "8px 18px",
                  fontSize: 13, fontWeight: 800,
                  textDecoration: "none", letterSpacing: "0.01em",
                }}
              >
                {val !== "todos" && <span>{emoji}</span>}
                {label}
              </Link>
            )
          })}
        </nav>

        {!posts || posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📝</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.green900 }}>Nenhum artigo ainda</div>
            <div style={{ fontSize: 14, color: C.ink3, marginTop: 8 }}>Em breve novos conteúdos sobre finanças pessoais</div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}>
            {(posts as Post[]).map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                <article style={{
                  background: "#fff",
                  border: `1px solid ${C.divider}`,
                  borderRadius: 20,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  transition: "box-shadow 0.15s",
                }}>
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      style={{ width: "100%", height: 160, objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", height: 160,
                      background: C.green50,
                      display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 56,
                    }}>
                      {getEmoji(post.category)}
                    </div>
                  )}

                  <div style={{ padding: "20px 24px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800,
                        color: C.green500, letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}>
                        {getCategoryLabel(post.category)}
                      </span>
                      <span style={{ fontSize: 11, color: C.ink3, fontWeight: 700 }}>
                        · {post.reading_time_min ?? 3} min
                      </span>
                      {post.published_at && (
                        <span style={{ fontSize: 11, color: C.ink3, fontWeight: 700 }}>
                          · {new Date(post.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </div>

                    <h2 style={{
                      fontWeight: 800, fontSize: 16,
                      color: C.green900, margin: 0,
                      lineHeight: 1.35, letterSpacing: "-0.01em",
                    }}>
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p style={{
                        fontSize: 13.5, color: C.ink2, margin: 0,
                        lineHeight: 1.55, flex: 1,
                        display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {post.excerpt}
                      </p>
                    )}

                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 12, fontWeight: 800, color: C.green500, marginTop: 4,
                    }}>
                      Ler artigo →
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{
          background: C.green900, borderRadius: 24,
          padding: "48px 40px", textAlign: "center", marginTop: 72,
        }}>
          <div style={{
            display: "inline-block",
            background: "rgba(0,200,83,0.15)", color: C.green500,
            fontWeight: 800, fontSize: 12, letterSpacing: "0.12em",
            textTransform: "uppercase", padding: "6px 14px",
            borderRadius: 999, marginBottom: 20,
          }}>
            Coloque em prática
          </div>
          <h2 style={{
            fontWeight: 800, fontSize: 28, color: "#fff",
            margin: "0 0 12px", letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>
            O que você aprendeu hoje pode<br />virar sua próxima meta.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", margin: "0 0 28px", fontSize: 16, lineHeight: 1.6 }}>
            O Assessor IA do iMoney te ajuda a transformar esse conhecimento em ação.
          </p>
          <Link href="/login" style={{
            display: "inline-block",
            background: C.green500, color: C.green900,
            padding: "14px 32px", borderRadius: 100,
            textDecoration: "none", fontWeight: 800, fontSize: 15,
          }}>
            Começar gratuitamente →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
