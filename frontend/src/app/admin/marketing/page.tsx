"use client";
import { useState, useEffect } from "react";

type Post = {
  id: string; platform: string; content_type: string; tema: string;
  angulo: string; caption: string; hashtags: string[]; cta: string;
  melhor_horario: string; visual_description: string; scheduled_for: string;
  status: string; notas_rejeicao?: string;
};

const TYPE_LABELS: Record<string, string> = {
  reels_script: "🎬 Reels", carrossel: "🃏 Carrossel", single_post: "📸 Post",
};
const STATUS_COLORS: Record<string, string> = {
  aguardando_aprovacao: "#ea580c", aprovado: "#16a34a",
  rejeitado: "#dc2626", publicado: "#6b7280",
};

export default function MarketingPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [notas, setNotas] = useState("");
  const [filter, setFilter] = useState("aguardando_aprovacao");

  const fetchPosts = async () => {
    setLoading(true);
    const res = await fetch("/api/agents/marketing");
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const generateWeek = async () => {
    setGenerating(true);
    await fetch("/api/agents/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dias: 7 }) });
    await fetchPosts();
    setGenerating(false);
  };

  const updateStatus = async (id: string, status: string, notas_rejeicao?: string) => {
    await fetch(`/api/agents/marketing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notas_rejeicao }),
    });
    await fetchPosts();
    setSelectedPost(null);
    setNotas("");
  };

  const filtered = posts.filter(p => filter === "todos" ? true : p.status === filter);
  const pending = posts.filter(p => p.status === "aguardando_aprovacao").length;
  const approved = posts.filter(p => p.status === "aprovado").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: "#0f172a" }}>📱 Pipeline de Marketing</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Lucas gera, você aprova em 15 min</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#ea580c" }}>
            ⏳ {pending} aguardando
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
            ✅ {approved} aprovados
          </div>
          <button onClick={generateWeek} disabled={generating} style={{ background: "#16a34a", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, color: "#fff", cursor: generating ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif", opacity: generating ? 0.6 : 1 }}>
            {generating ? "Gerando..." : "⚡ Gerar semana"}
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["aguardando_aprovacao", "⏳ Para aprovar"], ["aprovado", "✅ Aprovados"], ["rejeitado", "❌ Rejeitados"], ["publicado", "📤 Publicados"], ["todos", "Todos"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{ background: filter === val ? "#0f172a" : "#fff", color: filter === val ? "#fff" : "#475569", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Carregando posts...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>Nenhum post aqui ainda</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Clique em "Gerar semana" para o Lucas criar 7 posts para você aprovar</div>
            <button onClick={generateWeek} disabled={generating} style={{ background: "#16a34a", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
              ⚡ Gerar semana agora
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {filtered.map(post => (
              <div key={post.id} onClick={() => setSelectedPost(post)} style={{ background: "#fff", border: `1px solid ${post.status === "aguardando_aprovacao" ? "#fed7aa" : "#e2e8f0"}`, borderLeft: `4px solid ${STATUS_COLORS[post.status] || "#e2e8f0"}`, borderRadius: 12, padding: "16px", cursor: "pointer", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 20 }}>{TYPE_LABELS[post.content_type] || post.content_type}</span>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginTop: 6 }}>{post.tema}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
                    <div>{new Date(post.scheduled_for).toLocaleDateString("pt-BR")}</div>
                    <div>{post.melhor_horario}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {post.caption}
                </p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(post.hashtags || []).slice(0, 4).map(h => (
                    <span key={h} style={{ fontSize: 10, color: "#16a34a", background: "#f0fdf4", padding: "1px 6px", borderRadius: 20 }}>#{h}</span>
                  ))}
                </div>
                {post.status === "aguardando_aprovacao" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={e => { e.stopPropagation(); updateStatus(post.id, "aprovado"); }} style={{ flex: 1, background: "#16a34a", border: "none", borderRadius: 8, padding: "7px", fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>✅ Aprovar</button>
                    <button onClick={e => { e.stopPropagation(); setSelectedPost(post); }} style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px", fontSize: 12, color: "#475569", cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Ver mais</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalhe */}
      {selectedPost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }} onClick={() => setSelectedPost(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 20 }}>{TYPE_LABELS[selectedPost.content_type] || selectedPost.content_type}</span>
                <h2 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{selectedPost.tema}</h2>
              </div>
              <button onClick={() => setSelectedPost(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Ângulo</div>
                <div style={{ fontSize: 13, color: "#475569" }}>{selectedPost.angulo}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Caption</div>
                <div style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", whiteSpace: "pre-wrap" }}>{selectedPost.caption}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Visual (para criar no Canva/CapCut)</div>
                <div style={{ fontSize: 13, color: "#475569", background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "10px 12px" }}>{selectedPost.visual_description}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>CTA</div>
                <div style={{ fontSize: 13, color: "#16a34a", fontWeight: 700 }}>{selectedPost.cta}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Hashtags</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(selectedPost.hashtags || []).map(h => (
                    <span key={h} style={{ fontSize: 12, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 20 }}>#{h}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>📅 {new Date(selectedPost.scheduled_for).toLocaleDateString("pt-BR")}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>🕐 {selectedPost.melhor_horario}</span>
              </div>
            </div>

            {selectedPost.status === "aguardando_aprovacao" && (
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => updateStatus(selectedPost.id, "aprovado")} style={{ background: "#16a34a", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                  ✅ Aprovar post
                </button>
                <div>
                  <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Motivo da rejeição ou o que mudar..." style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, fontSize: 13, fontFamily: "'Nunito', sans-serif", resize: "none", marginBottom: 8 }} rows={2} />
                  <button onClick={() => updateStatus(selectedPost.id, "rejeitado", notas)} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px", fontSize: 13, color: "#dc2626", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                    ❌ Rejeitar e pedir reescrita
                  </button>
                </div>
              </div>
            )}
            {selectedPost.status === "aprovado" && (
              <button onClick={() => updateStatus(selectedPost.id, "publicado")} style={{ width: "100%", marginTop: 20, background: "#0f172a", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                📤 Marcar como publicado
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
