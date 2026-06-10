"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { pickReward } from "@/lib/streak";

const RECOMPENSAS = [
  { emoji: "📊", titulo: "Você desbloqueou um relatório de padrões de gasto", cta: "Ver relatório →", href: "/dashboard/relatorio" },
  { emoji: "💬", titulo: "Você ganhou +5 mensagens no Assessor hoje", cta: "Usar agora →", href: "/dashboard/assessor" },
  { emoji: "🚀", titulo: "Sua meta foi recalculada com uma rota mais curta", cta: "Ver minha rota →", href: "/dashboard/metas" },
];

export function WeeklyReward({ userId, isoWeekAtual, onClaimed }: {
  userId: string;
  isoWeekAtual: string;
  onClaimed?: () => void;
}) {
  const [estado, setEstado] = useState<"fechado" | "girando" | "revelado">("fechado");
  const [erro, setErro] = useState(false);
  const supabase = createSupabaseBrowser();
  const premio = pickReward(userId, isoWeekAtual);
  const recompensa = RECOMPENSAS[premio];

  async function revelar() {
    if (estado !== "fechado") return;
    setEstado("girando");
    setErro(false);

    const { error } = await supabase
      .from("user_profiles")
      .update({ last_reward_week: isoWeekAtual })
      .eq("user_id", userId);
    if (error) { setErro(true); setEstado("fechado"); return; }

    if (premio === 1) {
      // +5 mensagens hoje: abate 5 do contador diário (pode ficar negativo — vira crédito)
      const hoje = new Date().toISOString().split("T")[0];
      const { data: p, error: e1 } = await supabase
        .from("user_profiles")
        .select("daily_messages_count, daily_messages_date")
        .eq("user_id", userId)
        .maybeSingle();
      if (!e1) {
        const atual = p?.daily_messages_date === hoje ? (p?.daily_messages_count ?? 0) : 0;
        await supabase
          .from("user_profiles")
          .update({ daily_messages_count: atual - 5, daily_messages_date: hoje })
          .eq("user_id", userId);
      }
    }

    const reduzido = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => {
      navigator.vibrate?.([80, 40, 120]);
      setEstado("revelado");
      onClaimed?.();
    }, reduzido ? 0 : 1400);
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #1a3a1a 0%, #0d5435 100%)",
      borderRadius: 16, padding: "16px", marginBottom: 14,
      border: "1px solid rgba(249,168,37,0.35)",
      fontFamily: "Nunito, sans-serif",
    }}>
      <style>{`
        @keyframes giraCaixa { 0%,100%{transform:rotate(0) scale(1)} 25%{transform:rotate(-8deg) scale(1.06)} 75%{transform:rotate(8deg) scale(1.06)} }
        @keyframes revelaPremio { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        .wr-gira { animation: giraCaixa 0.35s ease-in-out infinite; }
        .wr-revela { animation: revelaPremio 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .wr-gira, .wr-revela { animation: none; } }
      `}</style>

      <p style={{ fontSize: 10, fontWeight: 800, color: "#F9A825", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
        🎁 Recompensa desbloqueada
      </p>

      {estado !== "revelado" ? (
        <>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.4 }}>
            7 dias ativos! Uma das caixas guarda sua recompensa da semana.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[0, 1, 2].map(i => (
              <div key={i}
                className={estado === "girando" ? "wr-gira" : undefined}
                style={{
                  background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.18)",
                  borderRadius: 12, padding: "18px 0", textAlign: "center", fontSize: 26,
                  animationDelay: `${i * 0.12}s`,
                }}>
                🎁
              </div>
            ))}
          </div>
          {erro && (
            <p style={{ fontSize: 12, color: "#FCD34D", margin: "0 0 8px", fontWeight: 600 }}>
              Algo deu errado — tente em instantes.
            </p>
          )}
          <button onClick={revelar} disabled={estado === "girando"} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "#F9A825", color: "#1a3a1a", fontSize: 14, fontWeight: 800,
            cursor: estado === "girando" ? "wait" : "pointer", fontFamily: "Nunito, sans-serif",
          }}>
            {estado === "girando" ? "Sorteando..." : "Revelar minha recompensa"}
          </button>
        </>
      ) : (
        <div className="wr-revela" style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>{recompensa.emoji}</div>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 14px", lineHeight: 1.4 }}>
            {recompensa.titulo}
          </p>
          <a href={recompensa.href} style={{
            display: "inline-block", padding: "10px 24px", borderRadius: 12,
            background: "#00C853", color: "#0a1f0a", fontSize: 13, fontWeight: 800,
            textDecoration: "none",
          }}>
            {recompensa.cta}
          </a>
        </div>
      )}
    </div>
  );
}
