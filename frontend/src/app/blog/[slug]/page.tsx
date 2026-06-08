import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { marked } from "marked";
import type { Metadata } from "next";

marked.setOptions({ breaks: true, gfm: true });

type Props = { params: Promise<{ slug: string }> };

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  author: string | null
  category: string | null
  tags: string[] | null
  reading_time_min: number | null
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  meta_title: string | null
  meta_description: string | null
  og_image_alt: string | null
  faq_schema: Array<{ question: string; answer: string }> | null
  internal_links: Array<{ anchor: string; slug: string }> | null
  keyword_principal: string | null
  article_type: string | null
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const { data } = await getSupabase()
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .lte("published_at", new Date().toISOString())
    .single()
  return data as BlogPost | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: "Artigo não encontrado | iMoney" }
  const title = post.meta_title || post.seo_title || post.title
  const description = post.meta_description || post.seo_description || post.excerpt || ""
  return {
    title: `${title} | iMoney`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      authors: [post.author ?? "Gui da iMoney"],
    },
    alternates: { canonical: `https://imoney.ia.br/blog/${post.slug}` },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    return (
      <div style={{ textAlign: "center", padding: 60, fontFamily: "'Nunito', sans-serif" }}>
        Artigo não encontrado.{" "}
        <Link href="/blog" style={{ color: "#1D9E75" }}>
          Voltar ao blog
        </Link>
      </div>
    )
  }

  const html = marked(post.content) as string
  const hasFaq = post.faq_schema && post.faq_schema.length > 0

  const faqJsonLd = hasFaq
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faq_schema!.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      })
    : null

  const articleJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    author: { "@type": "Person", name: post.author ?? "Gui da iMoney" },
    publisher: {
      "@type": "Organization",
      name: "iMoney",
      url: "https://imoney.ia.br",
    },
    datePublished: post.published_at,
    keywords: post.keyword_principal ?? undefined,
  })

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Nunito', sans-serif" }}>
      {/* JSON-LD schemas */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .prose h1{font-size:28px;font-weight:900;color:#0f172a;margin:32px 0 16px;line-height:1.3}
        .prose h2{font-size:22px;font-weight:800;color:#0f172a;margin:28px 0 12px;line-height:1.3;padding-bottom:8px;border-bottom:2px solid #f0fdf4}
        .prose h3{font-size:18px;font-weight:700;color:#0f172a;margin:24px 0 10px}
        .prose h4{font-size:16px;font-weight:700;color:#1D9E75;margin:20px 0 8px}
        .prose p{font-size:16px;color:#334155;line-height:1.85;margin:0 0 16px}
        .prose ul,.prose ol{padding-left:24px;margin:0 0 16px}
        .prose li{font-size:16px;color:#334155;line-height:1.8;margin-bottom:6px}
        .prose strong{font-weight:800;color:#0f172a}
        .prose em{font-style:italic;color:#475569}
        .prose blockquote{border-left:4px solid #1D9E75;padding:12px 16px;margin:20px 0;background:#f0fdf4;border-radius:0 8px 8px 0}
        .prose blockquote p{color:#085041;margin:0;font-weight:600}
        .prose code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:14px;font-family:monospace;color:#0f172a}
        .prose pre{background:#1e293b;padding:20px;border-radius:10px;overflow-x:auto;margin:16px 0}
        .prose pre code{background:transparent;color:#e2e8f0;font-size:13px}
        .prose a{color:#1D9E75;text-decoration:none;font-weight:600}
        .prose a:hover{text-decoration:underline}
        .prose hr{border:none;border-top:2px solid #f0fdf4;margin:32px 0}
        .prose table{width:100%;border-collapse:collapse;margin:20px 0}
        .prose th{background:#f0fdf4;padding:10px 14px;text-align:left;font-weight:700;color:#085041;font-size:14px}
        .prose td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:15px;color:#334155}
        .prose img{max-width:100%;border-radius:10px;margin:16px 0}
        .faq-item{border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px;overflow:hidden}
        .faq-item summary{padding:14px 18px;font-weight:700;font-size:15px;color:#0f172a;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}
        .faq-item summary::after{content:"＋";color:#1D9E75;font-size:18px;font-weight:400;transition:transform 0.2s}
        .faq-item[open] summary::after{content:"－"}
        .faq-item p{padding:0 18px 14px;margin:0;font-size:15px;color:#334155;line-height:1.7}
      `}</style>

      {/* Nav */}
      <div style={{ background: "linear-gradient(135deg, #0a3d28, #1D9E75)", padding: "16px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/blog" style={{ color: "#9FE1CB", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>← Voltar ao blog</Link>
          <Link href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 900, fontSize: 16 }}>🧭 iMoney</Link>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Meta */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1D9E75", background: "#f0fdf4", padding: "3px 12px", borderRadius: 20, border: "1px solid #b8e8d4" }}>
            {post.category || "Educação Financeira"}
          </span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>⏱ {post.reading_time_min} min de leitura</span>
          {post.published_at && (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {new Date(post.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          )}
          <span style={{ fontSize: 12, color: "#94a3b8" }}>por {post.author || "Gui da iMoney"}</span>
        </div>

        {/* Título */}
        <h1 style={{ fontWeight: 900, fontSize: "clamp(26px, 4vw, 38px)", color: "#0f172a", margin: "0 0 16px", lineHeight: 1.25 }}>
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p style={{ fontSize: 18, color: "#475569", margin: "0 0 28px", lineHeight: 1.7, fontWeight: 500 }}>
            {post.excerpt}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 32, flexWrap: "wrap" }}>
            {post.tags.map((tag: string) => (
              <span key={tag} style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "3px 10px", borderRadius: 20 }}>#{tag}</span>
            ))}
          </div>
        )}

        <hr style={{ border: "none", borderTop: "2px solid #f0fdf4", marginBottom: 36 }} />

        {/* Conteúdo renderizado */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

        {/* FAQ visual */}
        {hasFaq && (
          <div style={{ margin: "48px 0 0" }}>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: "#0f172a", marginBottom: 20 }}>Perguntas frequentes</h2>
            {post.faq_schema!.map((item, idx) => (
              <details key={idx} className="faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        )}

        <hr style={{ border: "none", borderTop: "2px solid #f0fdf4", margin: "48px 0 40px" }} />

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg, #0a3d28, #1D9E75)", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🧭</div>
          <h2 style={{ fontWeight: 900, fontSize: 22, color: "#fff", margin: "0 0 10px", lineHeight: 1.3 }}>
            Aplique isso nas suas finanças agora
          </h2>
          <p style={{ color: "#9FE1CB", margin: "0 0 24px", fontSize: 15 }}>
            O Assessor IA do iMoney te ajuda a colocar esses conceitos em prática
          </p>
          <Link href="/login" style={{ background: "#fff", color: "#1D9E75", padding: "14px 32px", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: 15, display: "inline-block", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
            Usar o iMoney gratuitamente →
          </Link>
        </div>
      </div>
    </div>
  )
}
