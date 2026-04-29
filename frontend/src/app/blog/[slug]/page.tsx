"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

export default function ArticlePage() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Nunito', sans-serif" }}>Carregando...</div>;
  if (!post) return <div style={{ textAlign: "center", padding: 60, fontFamily: "'Nunito', sans-serif" }}>Artigo não encontrado. <Link href="/blog">Voltar ao blog</Link></div>;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #14532d, #16a34a)", padding: "24px 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/blog" style={{ color: "#86efac", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>← Voltar ao blog</Link>
          <Link href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 900, fontSize: 18 }}>🧭 iMoney</Link>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
        {/* Meta */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 10px", borderRadius: 20 }}>{post.category}</span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>⏱ {post.reading_time_min} min de leitura</span>
          {post.published_at && <span style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(post.published_at).toLocaleDateString("pt-BR")}</span>}
        </div>

        {/* Título */}
        <h1 style={{ fontWeight: 900, fontSize: 36, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.3 }}>{post.title}</h1>
        <p style={{ fontSize: 18, color: "#475569", margin: "0 0 32px", lineHeight: 1.6 }}>{post.excerpt}</p>

        {/* Tags */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32, flexWrap: "wrap" }}>
          {(post.tags || []).map((tag: string) => (
            <span key={tag} style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 20 }}>#{tag}</span>
          ))}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", marginBottom: 32 }} />

        {/* Conteúdo */}
        <div
          style={{ fontSize: 16, color: "#1e293b", lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "40px 0" }} />

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg, #14532d, #16a34a)", borderRadius: 20, padding: 40, textAlign: "center" }}>
          <h2 style={{ fontWeight: 900, fontSize: 22, color: "#fff", margin: "0 0 8px" }}>Aplique isso nas suas finanças agora</h2>
          <p style={{ color: "#86efac", margin: "0 0 24px" }}>O assessor IA do iMoney te ajuda a colocar esses conceitos em prática</p>
          <Link href="/dashboard" style={{ background: "#fff", color: "#16a34a", padding: "14px 32px", borderRadius: 10, textDecoration: "none", fontWeight: 800, fontSize: 15, display: "inline-block" }}>
            Usar o iMoney gratuitamente →
          </Link>
        </div>
      </div>
    </div>
  );
}
