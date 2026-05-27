"use client";

import { useEffect, useState, useCallback } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: "rect" | "circle";
}

const COLORS = ["#00C853", "#FFD600", "#FF4081", "#40C4FF", "#E040FB", "#FFAB40", "#69F0AE", "#FFFFFF"];

function useConfetti(active: boolean) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    const count = 120;
    const ps: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 3 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 10 + 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }));
    setParticles(ps);
    const interval = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({ ...p, y: p.y + p.vy, x: p.x + p.vx, rotation: p.rotation + p.rotationSpeed, vy: p.vy + 0.05 }))
        .filter(p => p.y < 115)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [active]);

  return particles;
}

interface MetaCompletionProps {
  metaNome: string;
  metaValor: number;
  onNovaMeta: () => void;
  onFechar: () => void;
}

export function MetaCompletion({ metaNome, metaValor, onNovaMeta, onFechar }: MetaCompletionProps) {
  const particles = useConfetti(true);
  const [shared, setShared] = useState(false);

  async function compartilhar() {
    const texto = `🏆 Realizei minha meta financeira!\n\n"${metaNome}" — R$ ${metaValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\nCom a iMoney, meus sonhos viraram realidade. 💚\nimoney.ia.br`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Meta conquistada!", text: texto });
      } else {
        await navigator.clipboard.writeText(texto);
      }
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch { /* cancelled */ }
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(160deg, #0a3d28 0%, #064e2e 60%, #0d7a4e 100%)",
      zIndex: 300,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, overflow: "hidden",
      fontFamily: "'Nunito', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes pop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .cel-pop { animation: pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .cel-fade1 { animation: fadeUp 0.5s ease 0.2s forwards; opacity: 0; }
        .cel-fade2 { animation: fadeUp 0.5s ease 0.4s forwards; opacity: 0; }
        .cel-fade3 { animation: fadeUp 0.5s ease 0.6s forwards; opacity: 0; }
        .cel-shimmer { animation: shimmer 2s ease-in-out infinite; }
      `}</style>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute",
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.shape === "rect" ? p.size : p.size,
            height: p.shape === "rect" ? p.size * 0.5 : p.size,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color,
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0.9,
          }} />
        ))}
      </div>

      <div className="cel-pop" style={{ fontSize: 88, marginBottom: 8, filter: "drop-shadow(0 0 24px rgba(255,215,0,0.5))" }}>🏆</div>

      <div className="cel-fade1" style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 20, padding: "5px 16px", marginBottom: 20 }}>
        <span className="cel-shimmer" style={{ fontSize: 12, fontWeight: 800, color: "#FFD600", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          ⭐ Meta Conquistada
        </span>
      </div>

      <div className="cel-fade1" style={{ textAlign: "center", marginBottom: 12 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 8px", lineHeight: 1.2 }}>
          Você conseguiu!
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
          <strong style={{ color: "#A7F3D0" }}>{metaNome}</strong>
          <br />
          R$ {metaValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} guardados.
        </p>
      </div>

      <div className="cel-fade2" style={{ background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 20px", marginBottom: 32, maxWidth: 320, textAlign: "center", border: "1px solid rgba(255,255,255,0.12)" }}>
        <p style={{ fontSize: 14, color: "#d1fae5", fontStyle: "italic", margin: 0, lineHeight: 1.7, fontWeight: 600 }}>
          &ldquo;Cada meta conquistada é a prova de que você é capaz de realizar qualquer sonho.&rdquo;
        </p>
      </div>

      <div className="cel-fade3" style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 340 }}>
        <button onClick={compartilhar} style={{
          padding: "15px 0", borderRadius: 14, border: "2px solid rgba(255,255,255,0.3)",
          background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 15, fontWeight: 800,
          cursor: "pointer", fontFamily: "'Nunito',sans-serif", backdropFilter: "blur(10px)",
        }}>
          {shared ? "✅ Copiado! Compartilhe agora" : "📤 Compartilhar conquista"}
        </button>
        <button onClick={onNovaMeta} style={{
          padding: "15px 0", borderRadius: 14, border: "none",
          background: "#fff", color: "#0a3d28", fontSize: 15, fontWeight: 800,
          cursor: "pointer", fontFamily: "'Nunito',sans-serif",
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        }}>
          ✨ Criar próxima meta
        </button>
        <button onClick={onFechar} style={{
          padding: "12px 0", borderRadius: 14, border: "none",
          background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "'Nunito',sans-serif",
        }}>
          Ver minhas metas
        </button>
      </div>
    </div>
  );
}

interface MilestoneToastProps {
  pct: number;
  metaNome: string;
  onClose: () => void;
}

const MILESTONE_DATA: Record<number, { emoji: string; titulo: string; cor: string }> = {
  25: { emoji: "🌱", titulo: "Você deu o primeiro grande passo!", cor: "#4CAF50" },
  50: { emoji: "⚡", titulo: "Metade do caminho!", cor: "#FF9800" },
  75: { emoji: "🔥", titulo: "Tão perto do sonho!", cor: "#F44336" },
};

export function MilestoneToast({ pct, metaNome, onClose }: MilestoneToastProps) {
  const data = MILESTONE_DATA[pct] ?? MILESTONE_DATA[50];

  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 250, width: "calc(100% - 48px)", maxWidth: 400,
      background: "#fff", borderRadius: 18, padding: "16px 20px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
      display: "flex", alignItems: "center", gap: 14,
      fontFamily: "'Nunito', sans-serif",
      animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
    }}>
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateX(-50%) translateY(20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`}</style>
      <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
        <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke="#f0f0f0" strokeWidth="4" />
          <circle cx="26" cy="26" r="22" fill="none" stroke={data.cor} strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 22 * pct / 100} ${2 * Math.PI * 22}`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {data.emoji}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: data.cor, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
          {pct}% concluído
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0d2414", lineHeight: 1.3, marginBottom: 2 }}>
          {data.titulo}
        </div>
        <div style={{ fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {metaNome}
        </div>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18, padding: 4, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

interface StreakToastProps {
  mensagem: string;
  emoji?: string;
  onClose: () => void;
}

export function StreakToast({ mensagem, emoji = "💚", onClose }: StreakToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 250, maxWidth: 360, width: "calc(100% - 48px)",
      background: "linear-gradient(135deg, #0a3d28, #1D9E75)",
      borderRadius: 16, padding: "14px 18px",
      boxShadow: "0 8px 32px rgba(10,61,40,0.3)",
      display: "flex", alignItems: "center", gap: 12,
      fontFamily: "'Nunito', sans-serif",
      animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
    }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", flex: 1, lineHeight: 1.4 }}>{mensagem}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 18, padding: 4, lineHeight: 1 }}>×</button>
    </div>
  );
}

const MILESTONES = [25, 50, 75];

export function useMilestoneDetector() {
  const [milestone, setMilestone] = useState<{ pct: number; nome: string } | null>(null);
  const [shownMilestones, setShownMilestones] = useState<Set<string>>(new Set());

  const checkMilestone = useCallback((metaId: string, metaNome: string, pctAntes: number, pctDepois: number) => {
    for (const m of MILESTONES) {
      const key = `${metaId}-${m}`;
      if (pctAntes < m && pctDepois >= m && !shownMilestones.has(key)) {
        setMilestone({ pct: m, nome: metaNome });
        setShownMilestones(prev => new Set([...prev, key]));
        break;
      }
    }
  }, [shownMilestones]);

  const clearMilestone = useCallback(() => setMilestone(null), []);

  return { milestone, checkMilestone, clearMilestone };
}
