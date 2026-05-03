"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

export default function ArticlePage() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState('');
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    if (!slug) return;
    supabase.from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single()
      .then(({ data }) => {
        setPost(data);
        if (data?.content) {
          setHtml(marked(data.content) as string);
        }
        setLoading(false);
      });
  }, [slug]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #1D9E75", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!post) return (
    <div style={{ textAlign: "center", padding: 60, fontFamily: "'Nunito', sans-serif" }}>
      Artigo não encontrado. <Link href="/blog" style={{ color: "#1D9E75" }}>Voltar ao blog</Link>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Nunito', sans-serif" }}>
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
        <p style={{ fontSize: 18, color: "#475569", margin: "0 0 28px", lineHeight: 1.7, fontWeight: 500 }}>
          {post.excerpt}
        </p>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 32, flexWrap: "wrap" }}>
            {post.tags.map((tag: string) => (
              <span key={tag} style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "3px 10px", borderRadius: 20 }}>#{tag}</span>
            ))}
          </div>
        )}

        <hr style={{ border: "none", borderTop: "2px solid #f0fdf4", marginBottom: 36 }} />

        {/* Conteúdo renderizado */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

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
  );
}
