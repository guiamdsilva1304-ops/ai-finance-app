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

export function useConfetti(active: boolean) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setParticles([]);
      return;
    }
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
    navigator.vibrate?.([100, 50, 100, 50, 200]);
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
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const cardRef = useCallback((node: HTMLDivElement | null) => { storyCardRef = node; }, []);

  const ano = new Date().getFullYear();
  const valorFmt = `R$ ${metaValor.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  async function baixarCard() {
    if (!storyCardRef || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(storyCardRef, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const url = canvas.toDataURL("image/png");

      // Tenta compartilhar como arquivo (mobile)
      if (navigator.canShare) {
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], "minha-conquista-imoney.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Minha conquista no iMoney! 🏆" });
          setDownloaded(true);
          return;
        }
      }

      // Fallback: download direto
      const a = document.createElement("a");
      a.href = url;
      a.download = "minha-conquista-imoney.png";
      a.click();
      setDownloaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(160deg, #050f08 0%, #0a3d28 60%, #0d5435 100%)",
      zIndex: 300,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 20px", overflow: "hidden",
      fontFamily: "'Nunito', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes pop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,200,83,0.4)} 50%{box-shadow:0 0 0 16px rgba(0,200,83,0)} }
        .cel-pop { animation: pop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .cel-f1 { animation: fadeUp 0.5s ease 0.15s forwards; opacity:0; }
        .cel-f2 { animation: fadeUp 0.5s ease 0.3s forwards; opacity:0; }
        .cel-f3 { animation: fadeUp 0.5s ease 0.5s forwards; opacity:0; }
        .cel-pulse { animation: pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Confetti */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.shape === "rect" ? p.size * 0.45 : p.size,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color, transform: `rotate(${p.rotation}deg)`, opacity: 0.85,
          }} />
        ))}
      </div>

      {/* Trophy */}
      <div className="cel-pop" style={{ fontSize: 72, marginBottom: 6, filter: "drop-shadow(0 0 32px rgba(255,215,0,0.6))" }}>🏆</div>
      <div className="cel-f1" style={{ fontSize: 13, fontWeight: 800, color: "#FFD600", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, opacity: 0 }}>
        Meta Conquistada!
      </div>

      {/* ══ STORY CARD ══ */}
      <div className="cel-f2" style={{ opacity: 0, width: "100%", maxWidth: 340, marginBottom: 20 }}>
        <div
          ref={cardRef}
          style={{
            width: "100%",
            background: "linear-gradient(145deg, #0a3d28 0%, #116b3c 45%, #00C853 100%)",
            borderRadius: 28,
            padding: "32px 28px 28px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Círculos decorativos */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(0,200,83,0.08)", pointerEvents: "none" }} />

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#00C853", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18 }}>💚</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>iMoney</span>
          </div>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,215,0,0.2)", border: "1px solid rgba(255,215,0,0.5)", borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
            <span style={{ fontSize: 13 }}>⭐</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FFD600", textTransform: "uppercase", letterSpacing: "0.1em" }}>Sonho Realizado</span>
          </div>

          {/* Meta nome */}
          <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Minha conquista</p>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 20px", lineHeight: 1.2, fontFamily: "'Nunito', sans-serif" }}>
            {metaNome}
          </h2>

          {/* Valor */}
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 18, padding: "16px 20px", marginBottom: 20, border: "1px solid rgba(255,255,255,0.12)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Valor guardado</p>
            <p style={{ fontSize: 32, fontWeight: 900, color: "#00E676", margin: 0, fontFamily: "'Nunito', sans-serif", letterSpacing: "-0.5px" }}>
              {valorFmt}
            </p>
          </div>

          {/* Barra 100% */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>Progresso</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#00E676" }}>100% ✓</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
              <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, #00C853, #00E676)", borderRadius: 999 }} />
            </div>
          </div>

          {/* Rodapé */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0, fontWeight: 600 }}>imoney.ia.br · {ano}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0, fontWeight: 600 }}>Seus sonhos têm um plano. 💚</p>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="cel-f3" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340, opacity: 0 }}>
        <button
          onClick={baixarCard}
          disabled={downloading}
          className="cel-pulse"
          style={{
            padding: "16px 0", borderRadius: 16, border: "none",
            background: downloaded ? "#00C853" : "linear-gradient(135deg, #00C853, #00E676)",
            color: "#fff", fontSize: 15, fontWeight: 800,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "'Nunito',sans-serif",
            boxShadow: "0 8px 28px rgba(0,200,83,0.4)",
          }}
        >
          {downloading ? "Gerando imagem..." : downloaded ? "✅ Salvo! Poste no Story" : "📲 Salvar e Compartilhar"}
        </button>
        <button onClick={onNovaMeta} style={{
          padding: "15px 0", borderRadius: 16, border: "2px solid rgba(255,255,255,0.2)",
          background: "transparent", color: "#fff", fontSize: 15, fontWeight: 800,
          cursor: "pointer", fontFamily: "'Nunito',sans-serif",
        }}>
          ✨ Criar próxima meta
        </button>
        <button onClick={onFechar} style={{
          padding: "10px 0", borderRadius: 14, border: "none",
          background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "'Nunito',sans-serif",
        }}>
          Ver minhas metas
        </button>
      </div>
    </div>
  );
}

// Ref global para o card (fora do componente para evitar closure stale)
let storyCardRef: HTMLDivElement | null = null;

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

interface MetaProgressToastProps {
  metaId: string;
  metaNome: string;
  emoji: string;
  valorAtual: number;
  valorAlvo: number;
  valorEntrada: number;
  onClose: () => void;
}

// Micro-celebração ao registrar receita: progresso da meta no card,
// com o ganho potencial da entrada — não um toast genérico.
export function MetaProgressToast({ metaId, metaNome, emoji, valorAtual, valorAlvo, valorEntrada, onClose }: MetaProgressToastProps) {
  const pctAtual = valorAlvo > 0 ? Math.min(100, (valorAtual / valorAlvo) * 100) : 0;
  const pctPotencial = valorAlvo > 0 ? Math.min(100, ((valorAtual + valorEntrada) / valorAlvo) * 100) : 0;
  const ganhoPct = Math.round(pctPotencial - pctAtual);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setFill(pctAtual), reduzido ? 0 : 80);
    if (!reduzido) navigator.vibrate?.(60);
    const c = setTimeout(onClose, 9000);
    return () => { clearTimeout(t); clearTimeout(c); };
  }, [pctAtual, onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 250, width: "calc(100% - 48px)", maxWidth: 400,
      background: "#fff", borderRadius: 18, padding: "16px 18px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
      fontFamily: "'Nunito', sans-serif",
      animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
    }}>
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateX(-50%) translateY(20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} } @media (prefers-reduced-motion: reduce){ .mpt-bar{transition:none !important} }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#00A344", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>
            + R$ {valorEntrada.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} registrados
          </p>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#0d2414", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ganhoPct >= 1
              ? <>Isso pode virar <strong style={{ color: "#00A344" }}>+{ganhoPct}%</strong> de &ldquo;{metaNome}&rdquo;</>
              : <>Cada entrada te aproxima de &ldquo;{metaNome}&rdquo;</>}
          </p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18, padding: 4, lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>
      <div style={{ position: "relative", height: 8, background: "#f0f0f0", borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
        {/* Potencial (translúcido) por trás do progresso real */}
        <div style={{ position: "absolute", inset: 0, width: `${pctPotencial}%`, background: "rgba(0,200,83,0.25)", borderRadius: 999 }} />
        <div className="mpt-bar" style={{ position: "absolute", inset: 0, width: `${fill}%`, background: "linear-gradient(90deg, #1D9E75, #00C853)", borderRadius: 999, transition: "width 0.9s cubic-bezier(0.34,1.2,0.64,1)" }} />
      </div>
      <a href={`/dashboard/metas/${metaId}`} style={{
        display: "block", textAlign: "center", padding: "10px 0", borderRadius: 12,
        background: "#00C853", color: "#0a1f0a", fontSize: 13, fontWeight: 800, textDecoration: "none",
      }}>
        Guardar na meta →
      </a>
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
