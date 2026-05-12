"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";
import { C, FONT } from "@/components/imoney/tokens";
import type { Meta } from "@/types";
import { Trash2, CheckCircle2, Star } from "lucide-react";

type MetaExt = Meta & { principal?: boolean };

const MILESTONES = [
  { label: "Primeiro empurrão", pct: 25 },
  { label: "Metade do caminho", pct: 50 },
  { label: "Reta final começou", pct: 75 },
  { label: "Conquista 🎉", pct: 100 },
];

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

function metaEmoji(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("reserva") || n.includes("emergên") || n.includes("emergenc")) return "🏦";
  if (n.includes("viagem") || n.includes("férias") || n.includes("ferias") || n.includes("europa")) return "✈️";
  if (n.includes("carro") || n.includes("auto") || n.includes("moto")) return "🚗";
  if (n.includes("casa") || n.includes("apto") || n.includes("imóv") || n.includes("entrada")) return "🏡";
  if (n.includes("casamento") || n.includes("noivado") || n.includes("anel")) return "💍";
  if (n.includes("estud") || n.includes("curso") || n.includes("faculd") || n.includes("mba")) return "📚";
  if (n.includes("invest") || n.includes("bolsa")) return "📈";
  if (n.includes("celular") || n.includes("iphone") || n.includes("notebook")) return "📱";
  if (n.includes("filho") || n.includes("bebê") || n.includes("filhos")) return "👶";
  if (n.includes("aposent") || n.includes("reform")) return "🌴";
  return "🎯";
}

export default function MetaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [meta, setMeta] = useState<MetaExt | null>(null);
  const [userName, setUserName] = useState("iMoney");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [metaRes, profileRes] = await Promise.all([
        supabase.from("metas").select("*").eq("id", params.id as string).eq("user_id", user.id).single(),
        supabase.from("user_profiles").select("full_name").eq("user_id", user.id).single(),
      ]);
      if (metaRes.data) setMeta(metaRes.data as MetaExt);
      if (profileRes.data?.full_name) setUserName(profileRes.data.full_name.split(" ")[0]);
      setLoading(false);
    }
    load();
  }, [params.id, supabase]);

  async function handleComplete() {
    if (!meta) return;
    setCompleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const willComplete = !meta.concluida;
    await supabase.from("metas").update({ concluida: willComplete }).eq("id", meta.id).eq("user_id", user!.id);
    setMeta(prev => prev ? { ...prev, concluida: willComplete } : prev);
    if (willComplete) setShowCelebration(true);
    setCompleting(false);
  }

  async function handleTogglePrincipal() {
    if (!meta) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").update({ principal: false }).eq("user_id", user!.id);
    if (!meta.principal) {
      await supabase.from("metas").update({ principal: true }).eq("id", meta.id).eq("user_id", user!.id);
    }
    setMeta(prev => prev ? { ...prev, principal: !prev.principal } : prev);
  }

  async function handleDelete() {
    if (!meta || !confirm("Excluir esta meta?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").delete().eq("id", meta.id).eq("user_id", user!.id);
    router.push("/dashboard/metas");
  }

  async function handleAddValue(amount: number) {
    if (!meta) return;
    const novoValor = Math.min(meta.valor_alvo, meta.valor_atual + amount);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").update({ valor_atual: novoValor }).eq("id", meta.id).eq("user_id", user!.id);
    setMeta(prev => prev ? { ...prev, valor_atual: novoValor } : prev);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7fdf9" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #1D9E75", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!meta) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
        <p style={{ fontWeight: 800, color: C.green900 }}>Meta não encontrada</p>
        <button onClick={() => router.push("/dashboard/metas")} style={{ marginTop: 16, background: C.green500, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
          Voltar
        </button>
      </div>
    );
  }

  const falta = Math.max(0, meta.valor_alvo - meta.valor_atual);
  const pct = meta.valor_alvo > 0 ? Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100)) : 0;
  const aporte = meta.prazo_meses > 0 && falta > 0 ? falta / meta.prazo_meses : 0;
  const acelerarExtra = Math.round(aporte * 0.2);
  const novoAporte = aporte + acelerarExtra;
  const novosPrazoMeses = novoAporte > 0 ? falta / novoAporte : meta.prazo_meses;
  const semanasSalvas = Math.round((meta.prazo_meses - novosPrazoMeses) * 4.33);
  const emoji = meta.concluida ? "✨" : metaEmoji(meta.nome);

  return (
    <div style={{ minHeight: "100vh", background: "#f7fdf9", fontFamily: FONT, paddingBottom: 100 }}>
      {/* Celebration overlay */}
      {showCelebration && (
        <div style={{ position: "fixed", inset: 0, background: "#0a3d28", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#f9a825", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>PARABÉNS!</p>
          <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", textAlign: "center", marginBottom: 12, lineHeight: 1.2 }}>Você realizou sua meta.</p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 40 }}>
            {meta.nome}: R$ {fmtBRL(meta.valor_alvo)} guardados. Qual é o próximo sonho?
          </p>
          <button onClick={() => { setShowCelebration(false); router.push("/dashboard/metas?add=true"); }}
            style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: 16, padding: "16px 32px", fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: "pointer", marginBottom: 12, width: "100%", maxWidth: 320 }}>
            ✨ Criar nova meta
          </button>
          <button onClick={() => setShowCelebration(false)}
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "none", borderRadius: 16, padding: "14px 32px", fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: "pointer", width: "100%", maxWidth: 320 }}>
            Ver minhas metas
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ background: C.green900, padding: "20px 20px 64px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button onClick={() => router.push("/dashboard/metas")} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 12, padding: "8px 14px", cursor: "pointer", color: "#fff", fontSize: 18, fontFamily: FONT, fontWeight: 700 }}>
            ←
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {!meta.concluida && (
              <button onClick={handleTogglePrincipal} title={meta.principal ? "Remover principal" : "Marcar como principal"}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: "8px 10px", cursor: "pointer", color: meta.principal ? "#f9a825" : "rgba(255,255,255,0.6)" }}>
                <Star size={16} fill={meta.principal ? "currentColor" : "none"} />
              </button>
            )}
            <button onClick={handleDelete}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: "8px 10px", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 60, marginBottom: 14 }}>{emoji}</div>
          {!meta.concluida ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>FALTA PARA CONQUISTAR</p>
              <p style={{ fontSize: 40, fontWeight: 900, color: "#fff", margin: "0 0 4px", lineHeight: 1, fontFamily: FONT }}>
                R$ {fmtBRL(falta)}
              </p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>{meta.nome}</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#00C853", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>META CONQUISTADA</p>
              <p style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 4px", fontFamily: FONT }}>
                R$ {fmtBRL(meta.valor_alvo)}
              </p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>{meta.nome}</p>
            </>
          )}
        </div>
      </div>

      {/* Progress card — overlaps header */}
      <div style={{ margin: "0 16px", marginTop: -32, background: "#fff", borderRadius: 20, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: 16, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>Progresso</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: C.green500 }}>{pct}%</span>
        </div>
        <div style={{ background: "#e8f5e9", height: 12, borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ background: "linear-gradient(90deg, #1D9E75, #00C853)", height: "100%", borderRadius: 999, width: `${pct}%`, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 12, color: C.ink3, margin: 0 }}>
            {pct < 5 ? `${pct}% · começando` : meta.prazo_meses >= 24 ? `${pct}% · ${Math.round(meta.prazo_meses / 12)} anos restantes` : meta.prazo_meses === 1 ? `${pct}% · último mês` : `${pct}% · faltam ${meta.prazo_meses} meses`}
          </p>
          <p style={{ fontSize: 12, color: C.ink3, margin: 0 }}>de R$ {fmtBRL(meta.valor_alvo)}</p>
        </div>
      </div>

      {/* Registrar progresso */}
      {!meta.concluida && (
        <div style={{ margin: "0 16px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Registrar progresso</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[50, 100, 500, 1000].map(v => (
              <button key={v} onClick={() => handleAddValue(v)}
                style={{ flex: 1, fontSize: 12, fontWeight: 700, fontFamily: FONT, background: "#fff", border: `1.5px solid ${C.green100}`, color: "#15803d", padding: "10px 4px", borderRadius: 10, cursor: "pointer" }}>
                +{fmtInt(v)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly stats */}
      {!meta.concluida && aporte > 0 && (
        <div style={{ margin: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", border: `1.5px solid ${C.green100}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>MENSAL</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.green900, margin: 0, fontFamily: FONT }}>R$ {fmtInt(aporte)}</p>
          </div>
          {acelerarExtra > 0 && semanasSalvas > 0 && (
            <div style={{ background: "#f0fdf4", borderRadius: 16, padding: "14px 16px", border: "1.5px solid #bbf7d0" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.green500, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>ACELERE COM</p>
              <p style={{ fontSize: 14, fontWeight: 900, color: C.green900, margin: 0, fontFamily: FONT }}>+R$ {fmtInt(acelerarExtra)}/mês</p>
              <p style={{ fontSize: 11, color: C.green500, margin: "2px 0 0", fontWeight: 700 }}>
                = {semanasSalvas > 7 ? `${Math.round(semanasSalvas / 4)} meses antes` : `${semanasSalvas} sem antes`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Marcos da jornada */}
      <div style={{ margin: "0 16px 16px", background: "#fff", borderRadius: 16, padding: "16px 20px", border: `1.5px solid ${C.green100}` }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: C.green900, margin: "0 0 16px", fontFamily: FONT }}>Marcos da jornada</p>
        {MILESTONES.map((ms, i) => {
          const targetAmt = meta.valor_alvo * ms.pct / 100;
          const done = meta.valor_atual >= targetAmt;
          return (
            <div key={ms.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: i < MILESTONES.length - 1 ? 12 : 0, marginBottom: i < MILESTONES.length - 1 ? 12 : 0, borderBottom: i < MILESTONES.length - 1 ? `1px solid #f0f9f4` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: done ? C.green500 : "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: done ? C.green900 : C.ink3, margin: 0 }}>{ms.label}</p>
                  <p style={{ fontSize: 11, color: C.ink3, margin: 0 }}>R$ {fmtBRL(targetAmt)}</p>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: done ? C.green500 : C.ink3 }}>{done ? "FEITO" : `${ms.pct}%`}</span>
            </div>
          );
        })}
      </div>

      {/* Gui Sugere */}
      {!meta.concluida && aporte > 0 && (
        <div style={{ margin: "0 16px 24px", background: C.green900, borderRadius: 16, padding: "16px 20px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
            {userName.toUpperCase()} SUGERE
          </p>
          <p style={{ fontSize: 13, color: "#fff", margin: 0, lineHeight: 1.55 }}>
            Subindo o aporte para R$ {fmtInt(novoAporte)}/mês você chega {semanasSalvas > 7 ? `${Math.round(semanasSalvas / 4)} meses mais cedo` : `${semanasSalvas} semanas antes`}. Vale o esforço! 💪
          </p>
        </div>
      )}

      {/* Marcar como concluída */}
      {!meta.concluida && (
        <div style={{ margin: "0 16px 24px" }}>
          <button onClick={handleComplete} disabled={completing}
            style={{ width: "100%", background: meta.concluida ? "#fff" : C.green500, color: meta.concluida ? C.green500 : "#fff", border: `1.5px solid ${C.green500}`, borderRadius: 14, padding: "14px 0", fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: completing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: completing ? 0.7 : 1 }}>
            <CheckCircle2 size={18} />
            {completing ? "Salvando..." : "Marcar como conquistada 🎉"}
          </button>
        </div>
      )}
      {meta.concluida && (
        <div style={{ margin: "0 16px 24px" }}>
          <button onClick={handleComplete} disabled={completing}
            style={{ width: "100%", background: "#fff", color: C.ink3, border: `1.5px solid ${C.divider}`, borderRadius: 14, padding: "14px 0", fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}>
            Reabrir meta
          </button>
        </div>
      )}
    </div>
  );
}
