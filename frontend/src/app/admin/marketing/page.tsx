"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Post = {
  id: string;
  plataforma: string;
  titulo: string;
  conteudo: string;
  status: string;
  created_at: string;
  metadata: {
    analista?: { insights?: string[]; oportunidade_do_dia?: string; tom_recomendado?: string };
    estrategista?: { tema_do_dia?: string; pilar_sepc?: string; hook_principal?: string };
    data_geracao?: string;
  };
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "#FF0050",
  instagram: "#E1306C",
  linkedin: "#0A66C2",
};

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  linkedin: "💼",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Aguardando revisão", color: "#F59E0B" },
  aprovado: { label: "Aprovado", color: "#00C853" },
  rejeitado: { label: "Rejeitado", color: "#EF4444" },
};

export default function AdminMarketingPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [filter, setFilter] = useState<"todos" | "pendente" | "aprovado" | "rejeitado">("pendente");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    setPosts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const runPipeline = async () => {
    setRunning(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/agents/marketing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
          "x-cron-secret": process.env.NEXT_PUBLIC_CRON_SECRET ?? "",
        },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", msg: `✅ Time executou! Tema: "${data.tema_do_dia}" — ${data.posts_gerados} posts gerados.` });
        await fetchPosts();
        setFilter("pendente");
      } else {
        setFeedback({ type: "error", msg: `❌ Erro: ${data.error}` });
      }
    } catch (e) {
      setFeedback({ type: "error", msg: "❌ Falha ao conectar com o pipeline." });
    }
    setRunning(false);
  };

  const handleAction = async (id: string, action: "aprovar" | "rejeitar") => {
    const newStatus = action === "aprovar" ? "aprovado" : "rejeitado";
    await supabase.from("admin_posts").update({ status: newStatus }).eq("id", id);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    if (selectedPost?.id === id) setSelectedPost((p) => p ? { ...p, status: newStatus } : p);
  };

  const filteredPosts = posts.filter(
    (p) => p.metadata?.agente === "marketing-team" && (filter === "todos" || p.status === filter)
  );

  const pendingCount = posts.filter((p) => p.metadata?.agente === "marketing-team" && p.status === "pendente").length;

  const parseConteudo = (raw: string) => {
    try { return JSON.parse(raw); } catch { return {}; }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "Nunito, sans-serif", padding: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#00C853", margin: 0 }}>
            🤖 Time de Marketing IA
          </h1>
          <p style={{ color: "#8b949e", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
            Analista → Estrategista → Copywriter · Automático todo dia às 8h
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {pendingCount > 0 && (
            <span style={{ background: "#F59E0B", color: "#000", borderRadius: "999px", padding: "0.2rem 0.8rem", fontSize: "0.8rem", fontWeight: 700 }}>
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={runPipeline}
            disabled={running}
            style={{
              background: running ? "#1a3a1a" : "#00C853",
              color: running ? "#00C853" : "#0d1117",
              border: "none",
              borderRadius: "8px",
              padding: "0.6rem 1.4rem",
              fontWeight: 700,
              cursor: running ? "not-allowed" : "pointer",
              fontSize: "0.95rem",
              transition: "all 0.2s",
            }}
          >
            {running ? "⏳ Gerando..." : "▶ Rodar agora"}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          background: feedback.type === "success" ? "#0d2d1a" : "#2d0d0d",
          border: `1px solid ${feedback.type === "success" ? "#00C853" : "#EF4444"}`,
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {(["pendente", "aprovado", "rejeitado", "todos"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "#00C853" : "#161b22",
              color: filter === f ? "#0d1117" : "#8b949e",
              border: `1px solid ${filter === f ? "#00C853" : "#30363d"}`,
              borderRadius: "6px",
              padding: "0.4rem 1rem",
              cursor: "pointer",
              fontWeight: filter === f ? 700 : 400,
              fontSize: "0.85rem",
              textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#8b949e" }}>Carregando posts...</div>
      ) : filteredPosts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#8b949e" }}>
          <p style={{ fontSize: "2rem" }}>🤖</p>
          <p>Nenhum post {filter === "todos" ? "gerado" : filter} ainda.</p>
          <p style={{ fontSize: "0.85rem" }}>Clique em "Rodar agora" para o time gerar o conteúdo de hoje.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selectedPost ? "1fr 1fr" : "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
          {/* Post cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filteredPosts.map((post) => {
              const conteudo = parseConteudo(post.conteudo);
              const color = PLATFORM_COLORS[post.plataforma] ?? "#8b949e";
              const icon = PLATFORM_ICONS[post.plataforma] ?? "📄";
              const statusInfo = STATUS_LABELS[post.status];
              const isSelected = selectedPost?.id === post.id;

              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(isSelected ? null : post)}
                  style={{
                    background: isSelected ? "#161b22" : "#0d1117",
                    border: `1px solid ${isSelected ? color : "#30363d"}`,
                    borderRadius: "12px",
                    padding: "1.25rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: isSelected ? `0 0 0 2px ${color}33` : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                      <span style={{ color, fontWeight: 700, textTransform: "capitalize", fontSize: "0.95rem" }}>
                        {post.plataforma}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: statusInfo.color, background: `${statusInfo.color}22`, padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {post.metadata?.estrategista?.tema_do_dia && (
                    <p style={{ color: "#e6edf3", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                      {post.metadata.estrategista.tema_do_dia}
                    </p>
                  )}

                  {post.metadata?.estrategista?.pilar_sepc && (
                    <span style={{ fontSize: "0.75rem", background: "#1a3a1a", color: "#00C853", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                      {post.metadata.estrategista.pilar_sepc}
                    </span>
                  )}

                  <p style={{ color: "#8b949e", fontSize: "0.8rem", marginTop: "0.75rem" }}>
                    {new Date(post.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>

                  {/* Ações rápidas */}
                  {post.status === "pendente" && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleAction(post.id, "aprovar")}
                        style={{ flex: 1, background: "#00C85322", color: "#00C853", border: "1px solid #00C853", borderRadius: "6px", padding: "0.4rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}
                      >
                        ✓ Aprovar
                      </button>
                      <button
                        onClick={() => handleAction(post.id, "rejeitar")}
                        style={{ flex: 1, background: "#EF444422", color: "#EF4444", border: "1px solid #EF4444", borderRadius: "6px", padding: "0.4rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}
                      >
                        ✕ Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Painel de detalhe */}
          {selectedPost && (
            <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "12px", padding: "1.5rem", position: "sticky", top: "1rem", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h2 style={{ color: PLATFORM_COLORS[selectedPost.plataforma], margin: 0, fontSize: "1.1rem" }}>
                  {PLATFORM_ICONS[selectedPost.plataforma]} {selectedPost.plataforma.charAt(0).toUpperCase() + selectedPost.plataforma.slice(1)}
                </h2>
                <button onClick={() => setSelectedPost(null)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
              </div>

              {/* Insights do Analista */}
              {selectedPost.metadata?.analista?.insights && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ color: "#8b949e", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>📊 Insights do Analista</h3>
                  <ul style={{ margin: 0, padding: "0 0 0 1rem" }}>
                    {selectedPost.metadata.analista.insights.map((insight, i) => (
                      <li key={i} style={{ color: "#e6edf3", fontSize: "0.85rem", marginBottom: "0.25rem" }}>{insight}</li>
                    ))}
                  </ul>
                  {selectedPost.metadata.analista.oportunidade_do_dia && (
                    <p style={{ color: "#00C853", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      💡 {selectedPost.metadata.analista.oportunidade_do_dia}
                    </p>
                  )}
                </div>
              )}

              {/* Hook do Estrategista */}
              {selectedPost.metadata?.estrategista?.hook_principal && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ color: "#8b949e", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>🎯 Hook Principal</h3>
                  <p style={{ color: "#e6edf3", fontSize: "0.9rem", fontStyle: "italic", background: "#0d1117", padding: "0.75rem", borderRadius: "8px", borderLeft: "3px solid #00C853" }}>
                    "{selectedPost.metadata.estrategista.hook_principal}"
                  </p>
                </div>
              )}

              {/* Conteúdo gerado */}
              <div>
                <h3 style={{ color: "#8b949e", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>✍️ Conteúdo Gerado</h3>
                <ContentDetail plataforma={selectedPost.plataforma} conteudo={parseConteudo(selectedPost.conteudo)} />
              </div>

              {/* Ações */}
              {selectedPost.status === "pendente" && (
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button
                    onClick={() => handleAction(selectedPost.id, "aprovar")}
                    style={{ flex: 1, background: "#00C853", color: "#0d1117", border: "none", borderRadius: "8px", padding: "0.75rem", cursor: "pointer", fontWeight: 800, fontSize: "0.95rem" }}
                  >
                    ✓ Aprovar post
                  </button>
                  <button
                    onClick={() => handleAction(selectedPost.id, "rejeitar")}
                    style={{ flex: 1, background: "#EF444422", color: "#EF4444", border: "1px solid #EF4444", borderRadius: "8px", padding: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}
                  >
                    ✕ Rejeitar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentDetail({ plataforma, conteudo }: { plataforma: string; conteudo: Record<string, unknown> }) {
  const fieldStyle = { background: "#0d1117", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem" };
  const labelStyle = { color: "#8b949e", fontSize: "0.75rem", marginBottom: "0.4rem", display: "block" as const };
  const textStyle = { color: "#e6edf3", fontSize: "0.875rem", whiteSpace: "pre-wrap" as const, lineHeight: 1.6 };
  const tagsStyle = { display: "flex", flexWrap: "wrap" as const, gap: "0.35rem", marginTop: "0.4rem" };
  const tagStyle = { background: "#1a3a1a", color: "#00C853", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.75rem" };

  if (plataforma === "tiktok") {
    return (
      <>
        {conteudo.script && <div style={fieldStyle}><span style={labelStyle}>🎬 Roteiro</span><p style={textStyle}>{String(conteudo.script)}</p></div>}
        {conteudo.legenda && <div style={fieldStyle}><span style={labelStyle}>📝 Legenda</span><p style={textStyle}>{String(conteudo.legenda)}</p></div>}
        {Array.isArray(conteudo.hashtags) && <div style={fieldStyle}><span style={labelStyle}>🏷️ Hashtags</span><div style={tagsStyle}>{(conteudo.hashtags as string[]).map((h, i) => <span key={i} style={tagStyle}>{h}</span>)}</div></div>}
      </>
    );
  }

  if (plataforma === "instagram") {
    return (
      <>
        {conteudo.caption && <div style={fieldStyle}><span style={labelStyle}>📝 Caption</span><p style={textStyle}>{String(conteudo.caption)}</p></div>}
        {Array.isArray(conteudo.slides) && (
          <div style={fieldStyle}>
            <span style={labelStyle}>🎠 Slides do Carrossel</span>
            {(conteudo.slides as string[]).map((s, i) => (
              <div key={i} style={{ background: "#161b22", borderRadius: "6px", padding: "0.5rem 0.75rem", marginBottom: "0.4rem", borderLeft: `2px solid #00C853` }}>
                <span style={{ color: "#00C853", fontSize: "0.7rem", fontWeight: 700 }}>Slide {i + 1}</span>
                <p style={{ ...textStyle, margin: "0.2rem 0 0" }}>{s}</p>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(conteudo.hashtags) && <div style={fieldStyle}><span style={labelStyle}>🏷️ Hashtags</span><div style={tagsStyle}>{(conteudo.hashtags as string[]).map((h, i) => <span key={i} style={tagStyle}>{h}</span>)}</div></div>}
      </>
    );
  }

  if (plataforma === "linkedin") {
    return (
      <>
        {conteudo.post && <div style={fieldStyle}><span style={labelStyle}>💼 Post LinkedIn</span><p style={textStyle}>{String(conteudo.post)}</p></div>}
        {Array.isArray(conteudo.hashtags) && <div style={fieldStyle}><span style={labelStyle}>🏷️ Hashtags</span><div style={tagsStyle}>{(conteudo.hashtags as string[]).map((h, i) => <span key={i} style={tagStyle}>{h}</span>)}</div></div>}
      </>
    );
  }

  return <pre style={{ ...textStyle, overflow: "auto" }}>{JSON.stringify(conteudo, null, 2)}</pre>;
}
