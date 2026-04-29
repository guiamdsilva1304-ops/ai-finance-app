"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Post = {
  id: string; slug: string; title: string; excerpt: string;
  category: string; tags: string[]; reading_time_min: number;
  published_at: string; cover_image_url: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  "educacao-financeira": "📚 Educação Financeira",
  "investimentos": "📈 Investimentos",
  "dividas": "💳 Dívidas",
  "planejamento": "🗓️ Planejamento",
};

const CATEGORY_COLORS: Record<string, string> = {
  "educacao-financeira": "#16a34a",
  "investimentos": "#0369a1",
  "dividas": "#dc2626",
  "planejamento": "#7c3aed",
};

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    fetch("/api/blog").then(r => r.json()).then(d => {
      setPosts((d.posts || []).filter((p: any) => p.published));
      setLoading(false);
    });
  }, []);

  const filtered = filter === "todos" ? posts : posts.filter(p => p.category === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #14532d, #16a34a)", padding: "60px 20px", textAlign: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontWeight: 900, fontSize: 28, color: "#fff", marginBottom: 8 }}>🧭 iMoney</div>
        </Link>
        <h1 style={{ fontWeight: 900, fontSize: 40, color: "#fff", margin: "0 0 12px" }}>Blog de Finanças</h1>
        <p style={{ color: "#86efac", fontSize: 18, margin: 0 }}>Educação financeira prática para o brasileiro</p>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {[["todos", "Todos"], ["educacao-financeira", "📚 Educação"], ["investimentos", "📈 Investimentos"], ["dividas", "💳 Dívidas"], ["planejamento", "🗓️ Planejamento"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{ background: filter === val ? "#16a34a" : "#fff", color: filter === val ? "#fff" : "#475569", border: "1px solid #e2e8f0", borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Carregando artigos...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Nenhum artigo ainda</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Em breve novos conteúdos sobre finanças pessoais</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {filtered.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", transition: "box-shadow 0.15s", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt={post.title} style={{ width: "100%", height: 180, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: 180, background: "linear-gradient(135deg, #14532d, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                      {post.category === "investimentos" ? "📈" : post.category === "dividas" ? "💳" : post.category === "planejamento" ? "🗓️" : "📚"}
                    </div>
                  )}
                  <div style={{ padding: 20 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: CATEGORY_COLORS[post.category] + "20", color: CATEGORY_COLORS[post.category], padding: "2px 8px", borderRadius: 20 }}>
                        {CATEGORY_LABELS[post.category] || post.category}
                      </span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>⏱ {post.reading_time_min} min</span>
                    </div>
                    <h2 style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", margin: "0 0 8px", lineHeight: 1.4 }}>{post.title}</h2>
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.excerpt}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg, #14532d, #16a34a)", borderRadius: 20, padding: 40, textAlign: "center", marginTop: 60 }}>
          <h2 style={{ fontWeight: 900, fontSize: 24, color: "#fff", margin: "0 0 8px" }}>Coloque em prática o que você aprendeu</h2>
          <p style={{ color: "#86efac", margin: "0 0 24px" }}>Use o assessor IA do iMoney para aplicar esses conceitos nas suas finanças</p>
          <Link href="/dashboard" style={{ background: "#fff", color: "#16a34a", padding: "14px 32px", borderRadius: 10, textDecoration: "none", fontWeight: 800, fontSize: 15, display: "inline-block" }}>
            Acessar o iMoney gratuitamente →
          </Link>
        </div>
      </div>
    </div>
  );
}
