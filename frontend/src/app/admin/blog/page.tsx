"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Post = {
  id: string; slug: string; title: string; excerpt: string;
  category: string; published: boolean; created_at: string;
};

const TEMAS = [
  "Como montar uma reserva de emergência do zero",
  "Como sair do rotativo do cartão de crédito",
  "Tesouro Direto vs Poupança: qual rende mais em 2026",
  "Como fazer um orçamento mensal que funciona de verdade",
  "O que é SELIC e como ela afeta seu dinheiro",
  "Score de crédito: como aumentar seu Serasa em 90 dias",
  "CDB, LCI, LCA: qual a diferença e qual escolher",
  "Regra 50-30-20: o método mais simples para controlar gastos",
];

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchPosts = async () => {
    setLoading(true);
    const res = await fetch("/api/blog");
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const generateArticle = async (index?: number) => {
    setGenerating(true);
    setMsg("");
    const body = index !== undefined ? { tema_index: index } : {};
    const res = await fetch("/api/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      setMsg("✅ Artigo gerado: " + data.post.title);
      await fetchPosts();
    } else {
      setMsg("❌ Erro: " + data.error);
    }
    setGenerating(false);
  };

  const togglePublish = async (post: Post) => {
    const { createSupabaseBrowser } = await import("@/lib/supabase");
    const supabase = createSupabaseBrowser();
    await supabase.from("blog_posts").update({
      published: !post.published,
      published_at: !post.published ? new Date().toISOString() : null,
    }).eq("id", post.id);
    await fetchPosts();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", fontSize: 13 }}>← Admin</Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: "#0f172a" }}>✍️ Blog iMoney</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Lucas gera artigos de SEO • Você publica</p>
        </div>
        <button onClick={() => generateArticle()} disabled={generating} style={{ background: "#16a34a", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, color: "#fff", cursor: generating ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif", opacity: generating ? 0.6 : 1 }}>
          {generating ? "Gerando..." : "⚡ Gerar artigo"}
        </button>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {msg && <div style={{ background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.startsWith("✅") ? "#bbf7d0" : "#fecaca"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: msg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{msg}</div>}

        {/* Temas rápidos */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 12 }}>⚡ Gerar artigo sobre tema específico</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TEMAS.map((tema, i) => (
              <button key={i} onClick={() => generateArticle(i)} disabled={generating} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#475569", cursor: generating ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif" }}>
                {tema}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de artigos */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{posts.length} artigos gerados</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{posts.filter(p => p.published).length} publicados • {posts.filter(p => !p.published).length} rascunhos</div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Carregando...</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Nenhum artigo ainda</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Clique em "Gerar artigo" para o Lucas escrever o primeiro</div>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{post.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{post.category} • {new Date(post.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/blog/${post.slug}`} target="_blank" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#475569", textDecoration: "none" }}>
                    👁️ Ver
                  </Link>
                  <button onClick={() => togglePublish(post)} style={{ background: post.published ? "#fef2f2" : "#f0fdf4", border: `1px solid ${post.published ? "#fecaca" : "#bbf7d0"}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, color: post.published ? "#dc2626" : "#16a34a", cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                    {post.published ? "⬇️ Despublicar" : "🚀 Publicar"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, fontSize: 12, color: "#16a34a" }}>
          💡 Artigos publicados aparecem em <strong>ai-finance-app-ashen.vercel.app/blog</strong> e são indexados pelo Google
        </div>
      </div>
    </div>
  );
}
