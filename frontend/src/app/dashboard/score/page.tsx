"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

interface ScoreData {
  score: number;
  titulo: string;
  resumo: string;
  pontos_fortes: string[];
  riscos: string[];
  plano_30_dias: string[];
  gerado_em?: string;
}

function getNivel(score: number) {
  if (score <= 30) return { label: "Crítico", color: "#ef4444", bg: "#fef2f2", border: "#fecaca" };
  if (score <= 50) return { label: "Atenção", color: "#f97316", bg: "#fff7ed", border: "#fed7aa" };
  if (score <= 70) return { label: "Estável", color: "#eab308", bg: "#fefce8", border: "#fef08a" };
  if (score <= 85) return { label: "Saudável", color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" };
  return { label: "Excelente", color: "#00C853", bg: "#f0fdf4", border: "#86efac" };
}

export default function ScorePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [data, setData] = useState<ScoreData | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const res = await fetch("/api/score-result", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 404) {
        router.push("/dashboard/diagnostico");
        return;
      }

      if (!res.ok) {
        const j = await res.json();
        setErro(j.error ?? "Erro ao carregar score");
        setLoading(false);
        return;
      }

      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!data) return;
    const target = data.score;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 60));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayScore(current);
      if (current >= target) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [data]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fdf9" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #1D9E75", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <p style={{ fontSize: 15, color: "#ef4444", fontWeight: 700 }}>{erro}</p>
        <button onClick={() => router.push("/dashboard/diagnostico")}
          style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: "#1D9E75", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) return null;

  const nivel = getNivel(data.score);
  const pct = Math.min(100, data.score);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fdf9", fontFamily: "'Nunito',sans-serif", padding: "24px 16px 48px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes barGrow { from{width:0%} to{width:${pct}%} }
        .s-card { animation: fadeUp 0.45s ease forwards; opacity: 0; }
        .s-bar { animation: barGrow 1.1s ease 0.4s forwards; width: 0%; }
      `}</style>

      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* Score hero */}
        <div className="s-card" style={{ background: "#fff", borderRadius: 24, padding: "32px 24px 28px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", marginBottom: 16, textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Score iMoney</p>

          <div style={{ position: "relative", display: "inline-flex", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontSize: 80, fontWeight: 900, color: nivel.color, lineHeight: 1, fontFamily: "'Nunito',sans-serif" }}>{displayScore}</span>
            <span style={{ fontSize: 22, color: "#d1d5db", fontWeight: 700, marginLeft: 2, alignSelf: "flex-end", paddingBottom: 8 }}>/100</span>
          </div>

          <div style={{ display: "inline-block", background: nivel.bg, border: `1.5px solid ${nivel.border}`, borderRadius: 20, padding: "4px 14px", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: nivel.color }}>{nivel.label}</span>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0d2414", margin: "0 0 12px" }}>{data.titulo}</h2>

          {/* Score bar */}
          <div style={{ height: 12, background: "#f3f4f6", borderRadius: 8, overflow: "hidden", margin: "0 0 6px" }}>
            <div className="s-bar" style={{ height: "100%", background: `linear-gradient(90deg, ${nivel.color}88, ${nivel.color})`, borderRadius: 8 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>0</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>100</span>
          </div>

          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: "16px 0 0", textAlign: "left" }}>{data.resumo}</p>
        </div>

        {/* Pontos fortes */}
        {data.pontos_fortes.length > 0 && (
          <div className="s-card" style={{ animationDelay: "0.1s", background: "#fff", borderRadius: 20, padding: "22px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#0d2414", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
              ✅ Pontos fortes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.pontos_fortes.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#f0fdf4", border: "1.5px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12 }}>✓</span>
                  </div>
                  <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.5, fontWeight: 600 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Riscos */}
        {data.riscos.length > 0 && (
          <div className="s-card" style={{ animationDelay: "0.2s", background: "#fff", borderRadius: 20, padding: "22px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#0d2414", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
              ⚠️ Pontos de atenção
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.riscos.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "#fff7ed", border: "1.5px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11 }}>!</span>
                  </div>
                  <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.5, fontWeight: 600 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plano 30 dias */}
        {data.plano_30_dias.length > 0 && (
          <div className="s-card" style={{ animationDelay: "0.3s", background: "linear-gradient(135deg, #0a3d28, #1D9E75)", borderRadius: 20, padding: "22px 20px", boxShadow: "0 8px 30px rgba(29,158,117,0.3)", marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
              📌 Plano dos próximos 30 dias
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.plano_30_dias.map((acao, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 900, color: "#fff" }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 14, color: "#fff", lineHeight: 1.5, fontWeight: 600 }}>{acao}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="s-card" style={{ animationDelay: "0.4s", display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => router.push("/dashboard/assessor")}
            style={{ width: "100%", padding: "16px 0", borderRadius: 14, border: "none", background: "#1D9E75", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif", boxShadow: "0 4px 20px rgba(29,158,117,0.35)" }}>
            💬 Falar com meu Assessor IA
          </button>
          <button onClick={() => router.push("/dashboard")}
            style={{ width: "100%", padding: "16px 0", borderRadius: 14, border: "2px solid #e8ede8", background: "#fff", color: "#0d2414", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>
            Ir para o Dashboard →
          </button>
          <button onClick={() => router.push("/dashboard/diagnostico")}
            style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: "transparent", color: "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>
            Refazer diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
}
