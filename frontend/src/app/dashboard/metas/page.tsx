"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";
import { RefreshCw, Trash2, CheckCircle2, Star } from "lucide-react";
import { GoalCard } from "@/components/imoney/primitives";
import { C, FONT } from "@/components/imoney/tokens";
import type { Meta } from "@/types";

type MetaExt = Meta & { principal?: boolean };

const CATEGORIES = [
  { label: "Casa própria", emoji: "🏠" },
  { label: "Viagem", emoji: "✈️" },
  { label: "Trocar de carro", emoji: "🚗" },
  { label: "Estudar", emoji: "🎓" },
  { label: "Casamento", emoji: "💍" },
  { label: "Reserva de emergência", emoji: "🛡️" },
  { label: "Filhos", emoji: "👶" },
  { label: "Aposentadoria", emoji: "🌴" },
];

function metaEmoji(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("reserva") || n.includes("emergên") || n.includes("emergenc")) return "🏦";
  if (n.includes("viagem") || n.includes("férias") || n.includes("ferias") || n.includes("europa") || n.includes("eua")) return "✈️";
  if (n.includes("carro") || n.includes("auto") || n.includes("moto") || n.includes("trocar")) return "🚗";
  if (n.includes("casa") || n.includes("apto") || n.includes("imóv") || n.includes("entrada")) return "🏡";
  if (n.includes("casamento") || n.includes("noivado") || n.includes("anel")) return "💍";
  if (n.includes("estud") || n.includes("curso") || n.includes("faculd") || n.includes("mba")) return "📚";
  if (n.includes("invest") || n.includes("bolsa") || n.includes("ação")) return "📈";
  if (n.includes("celular") || n.includes("iphone") || n.includes("notebook")) return "📱";
  if (n.includes("filho") || n.includes("bebê") || n.includes("filhos")) return "👶";
  if (n.includes("aposent") || n.includes("reform")) return "🌴";
  return "🎯";
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function statusLeft(meta: MetaExt): string {
  if (meta.concluida) return "CONQUISTADO!";
  const pct = meta.valor_alvo > 0 ? Math.round((meta.valor_atual / meta.valor_alvo) * 100) : 0;
  if (pct < 5) return `${pct}% · começando`;
  const m = meta.prazo_meses;
  if (m >= 24) return `${pct}% · ${Math.round(m / 12)} anos restantes`;
  if (m === 1) return `${pct}% · último mês`;
  return `${pct}% · faltam ${m} meses`;
}

function statusRight(meta: MetaExt, aporte: number): string {
  if (meta.concluida) return fmtDate(meta.criada_em ?? new Date().toISOString());
  return `R$ ${fmtInt(aporte)}/mês`;
}

function tone(meta: MetaExt): "white" | "dark" | "gold" {
  if (meta.concluida) return "gold";
  if (meta.principal) return "dark";
  return "white";
}

export default function MetasPage() {
  const router = useRouter();
  const [metas, setMetas] = useState<MetaExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sobra, setSobra] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Desktop form
  const [nome, setNome] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [prazo, setPrazo] = useState("12");
  const [formError, setFormError] = useState("");

  // Mobile onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [onboardingName, setOnboardingName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [onboardingValor, setOnboardingValor] = useState("");
  const [onboardingPrazo, setOnboardingPrazo] = useState("12");

  // Completion celebration
  const [completedMeta, setCompletedMeta] = useState<MetaExt | null>(null);

  const supabase = createSupabaseBrowser();

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Detect ?add=true
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("add") === "true") {
        setShowOnboarding(true);
        setOnboardingStep(1);
      }
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [metasRes, memRes, profileRes] = await Promise.all([
      supabase.from("metas").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("user_memory").select("last_renda,last_gastos").eq("user_id", user.id).single(),
      supabase.from("user_profiles").select("full_name").eq("user_id", user.id).single(),
    ]);
    setMetas(metasRes.data ?? []);
    if (memRes.data) setSobra((memRes.data.last_renda ?? 0) - (memRes.data.last_gastos ?? 0));
    if (profileRes.data?.full_name) setOnboardingName(profileRes.data.full_name.split(" ")[0]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!nome.trim()) { setFormError("Informe o nome da meta."); return; }
    const alvo = parseFloat(valorAlvo.replace(",", "."));
    if (isNaN(alvo) || alvo <= 0) { setFormError("Valor alvo inválido."); return; }
    const atual = parseFloat((valorAtual || "0").replace(",", "."));
    const meses = parseInt(prazo);
    if (meses < 1 || meses > 600) { setFormError("Prazo deve ser entre 1 e 600 meses."); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").insert({
      user_id: user!.id, nome: nome.trim().slice(0, 100),
      valor_alvo: alvo, valor_atual: atual,
      prazo_meses: meses, criada_em: new Date().toISOString().split("T")[0],
      concluida: false,
    });
    setNome(""); setValorAlvo(""); setValorAtual(""); setPrazo("12");
    setShowForm(false); setSaving(false); load();
  }

  async function saveOnboarding(e: React.FormEvent) {
    e.preventDefault();
    const alvo = parseFloat(onboardingValor.replace(",", "."));
    if (isNaN(alvo) || alvo <= 0) return;
    const meses = parseInt(onboardingPrazo);
    if (meses < 1 || meses > 600) return;
    const nomeMeta = selectedCategory || onboardingName || "Minha meta";
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: inserted } = await supabase.from("metas").insert({
      user_id: user!.id, nome: nomeMeta.trim().slice(0, 100),
      valor_alvo: alvo, valor_atual: 0,
      prazo_meses: meses, criada_em: new Date().toISOString().split("T")[0],
      concluida: false,
    }).select().single();
    setSaving(false);
    setShowOnboarding(false);
    setOnboardingStep(1);
    setSelectedCategory(null);
    setOnboardingValor("");
    setOnboardingPrazo("12");
    window.history.replaceState({}, "", "/dashboard/metas");
    load();
    if (inserted) router.push(`/dashboard/metas/${inserted.id}`);
  }

  async function toggleConcluida(meta: MetaExt) {
    const { data: { user } } = await supabase.auth.getUser();
    const willComplete = !meta.concluida;
    await supabase.from("metas").update({ concluida: willComplete }).eq("id", meta.id).eq("user_id", user!.id);
    if (willComplete) setCompletedMeta(meta);
    load();
  }

  async function togglePrincipal(meta: MetaExt) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").update({ principal: false }).eq("user_id", user!.id);
    if (!meta.principal) {
      await supabase.from("metas").update({ principal: true }).eq("id", meta.id).eq("user_id", user!.id);
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir meta?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").delete().eq("id", id).eq("user_id", user!.id);
    load();
  }

  async function updateValorAtual(meta: MetaExt, novoValor: number) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("metas").update({ valor_atual: novoValor }).eq("id", meta.id).eq("user_id", user!.id);
    load();
  }

  function calcAporte(meta: MetaExt): number {
    const falta = meta.valor_alvo - meta.valor_atual;
    return falta > 0 ? falta / meta.prazo_meses : 0;
  }

  const sorted = [
    ...metas.filter(m => !m.concluida && m.principal),
    ...metas.filter(m => !m.concluida && !m.principal),
    ...metas.filter(m => m.concluida),
  ];

  const aporteEstimado = valorAlvo && prazo
    ? (parseFloat(valorAlvo.replace(",", ".") || "0") - parseFloat(valorAtual.replace(",", ".") || "0")) / parseInt(prazo || "1")
    : null;

  const onbAporte = onboardingValor && onboardingPrazo
    ? parseFloat(onboardingValor.replace(",", ".") || "0") / parseInt(onboardingPrazo || "12")
    : null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 80px", fontFamily: FONT }}>
      {/* Completion celebration overlay */}
      {completedMeta && (
        <div style={{ position: "fixed", inset: 0, background: "#0a3d28", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#f9a825", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>PARABÉNS!</p>
          <p style={{ fontSize: 30, fontWeight: 900, color: "#fff", textAlign: "center", marginBottom: 14, lineHeight: 1.2, fontFamily: FONT }}>Você realizou sua meta.</p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", textAlign: "center", marginBottom: 48, maxWidth: 280 }}>
            {completedMeta.nome}: R$ {completedMeta.valor_alvo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} guardados. Qual é o próximo sonho?
          </p>
          <button onClick={() => { setCompletedMeta(null); setShowOnboarding(true); setOnboardingStep(1); }}
            style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: "pointer", marginBottom: 12, width: "100%", maxWidth: 320 }}>
            ✨ Criar nova meta
          </button>
          <button onClick={() => setCompletedMeta(null)}
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)", border: "none", borderRadius: 16, padding: "14px 0", fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: "pointer", width: "100%", maxWidth: 320 }}>
            Ver minhas metas
          </button>
        </div>
      )}

      {/* Mobile onboarding overlay */}
      {showOnboarding && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, overflowY: "auto", fontFamily: FONT }}>
          {/* Step 1: Name */}
          {onboardingStep === 1 && (
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "48px 28px 40px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#0a3d28", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
                  <span style={{ color: "#00C853", fontSize: 28, fontWeight: 900 }}>iM</span>
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: C.green900, margin: "0 0 10px", lineHeight: 1.2, fontFamily: FONT }}>
                  Seus sonhos<br />têm um plano.
                </h1>
                <p style={{ fontSize: 14, color: C.ink3, margin: "0 0 48px", lineHeight: 1.6 }}>
                  A iMoney cuida dele. Vamos transformar o que você quer em metas concretas — passo a passo, juntos.
                </p>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.ink2, display: "block", marginBottom: 8 }}>
                  Como você gostaria de ser chamado(a)?
                </label>
                <input
                  value={onboardingName}
                  onChange={e => setOnboardingName(e.target.value)}
                  placeholder="Seu nome"
                  autoFocus
                  style={{ width: "100%", border: `1.5px solid ${C.divider}`, borderRadius: 14, padding: "14px 16px", fontSize: 16, fontFamily: FONT, outline: "none", boxSizing: "border-box", color: C.green900 }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => setOnboardingStep(2)}
                  style={{ background: C.green500, color: C.green900, border: "none", borderRadius: 16, padding: "17px 0", fontWeight: 900, fontSize: 16, fontFamily: FONT, cursor: "pointer" }}>
                  Próximo passo →
                </button>
                <button onClick={() => { setShowOnboarding(false); window.history.replaceState({}, "", "/dashboard/metas"); }}
                  style={{ background: "none", color: C.ink3, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Category */}
          {onboardingStep === 2 && (
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "48px 28px 40px" }}>
              <button onClick={() => setOnboardingStep(1)} style={{ background: "none", border: "none", color: C.ink3, fontSize: 20, cursor: "pointer", marginBottom: 28, textAlign: "left", fontFamily: FONT, padding: 0 }}>←</button>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: C.green900, margin: "0 0 8px", fontFamily: FONT }}>
                  Oi, {onboardingName || "você"}! Qual é o seu sonho?
                </h1>
                <p style={{ fontSize: 13, color: C.ink3, margin: "0 0 28px" }}>
                  Não precisa ser o único — vamos começar pelo principal.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {CATEGORIES.map(({ label, emoji }) => (
                    <button key={label} onClick={() => setSelectedCategory(label)}
                      style={{ background: selectedCategory === label ? "#f0fdf4" : "#fff", border: `1.5px solid ${selectedCategory === label ? C.green500 : C.divider}`, borderRadius: 16, padding: "16px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 28 }}>{emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: selectedCategory === label ? C.green900 : C.ink2, textAlign: "left", fontFamily: FONT }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}>
                <button onClick={() => selectedCategory && setOnboardingStep(3)} disabled={!selectedCategory}
                  style={{ background: selectedCategory ? C.green500 : "#e8f5e9", color: selectedCategory ? C.green900 : C.ink3, border: "none", borderRadius: 16, padding: "17px 0", fontWeight: 900, fontSize: 16, fontFamily: FONT, cursor: selectedCategory ? "pointer" : "not-allowed" }}>
                  Próximo passo →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Value */}
          {onboardingStep === 3 && (
            <form onSubmit={saveOnboarding} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "48px 28px 40px" }}>
              <button type="button" onClick={() => setOnboardingStep(2)} style={{ background: "none", border: "none", color: C.ink3, fontSize: 20, cursor: "pointer", marginBottom: 28, textAlign: "left", fontFamily: FONT, padding: 0 }}>←</button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: C.green900, margin: "0 0 8px", fontFamily: FONT }}>
                  Sua meta — vamos calcular?
                </h1>
                <p style={{ fontSize: 13, color: C.ink3, margin: "0 0 32px" }}>
                  Quanto você precisa, a gente diz quanto guardar por mês.
                </p>

                <label style={{ fontSize: 13, fontWeight: 700, color: C.ink2, display: "block", marginBottom: 8 }}>Valor da meta</label>
                <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${C.divider}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
                  <span style={{ padding: "14px 16px", fontSize: 16, fontWeight: 700, color: C.ink3, background: "#f9fdf9", borderRight: `1px solid ${C.divider}`, fontFamily: FONT }}>R$</span>
                  <input
                    type="number"
                    value={onboardingValor}
                    onChange={e => setOnboardingValor(e.target.value)}
                    placeholder="10.000,00"
                    min="1" step="0.01"
                    autoFocus
                    style={{ flex: 1, border: "none", outline: "none", padding: "14px 16px", fontSize: 20, fontWeight: 700, fontFamily: FONT, color: C.green900, background: "#fff" }}
                  />
                </div>

                <label style={{ fontSize: 13, fontWeight: 700, color: C.ink2, display: "block", marginBottom: 8 }}>Em quanto tempo? (meses)</label>
                <input
                  type="number"
                  value={onboardingPrazo}
                  onChange={e => setOnboardingPrazo(e.target.value)}
                  min="1" max="600"
                  style={{ width: "100%", border: `1.5px solid ${C.divider}`, borderRadius: 14, padding: "14px 16px", fontSize: 16, fontFamily: FONT, outline: "none", boxSizing: "border-box", color: C.green900, marginBottom: 20 }}
                />

                {onbAporte !== null && !isNaN(onbAporte) && onbAporte > 0 && (
                  <div style={{ background: "#f0fdf4", border: `1.5px solid #bbf7d0`, borderRadius: 14, padding: "14px 16px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.green500, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>SUGESTÃO DA IMONEY</p>
                    <p style={{ fontSize: 14, color: C.green900, margin: 0, fontWeight: 600, fontFamily: FONT }}>
                      Guardando R$ {fmtInt(onbAporte)}/mês, em {onboardingPrazo} meses você chega lá 🎯
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}>
                <button type="submit" disabled={saving || !onboardingValor}
                  style={{ background: onboardingValor ? C.green900 : "#e8f5e9", color: onboardingValor ? "#fff" : C.ink3, border: "none", borderRadius: 16, padding: "17px 0", fontWeight: 900, fontSize: 16, fontFamily: FONT, cursor: onboardingValor && !saving ? "pointer" : "not-allowed" }}>
                  {saving ? "Criando..." : "Começar minha jornada →"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.green900, margin: 0 }}>🎯 Metas Financeiras</h1>
          <p style={{ fontSize: 13, color: C.ink3, marginTop: 4, marginBottom: 0 }}>
            Sobra mensal disponível: <strong style={{ color: C.green500 }}>R$ {fmtInt(sobra)}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ background: "none", border: `1.5px solid ${C.divider}`, borderRadius: 12, padding: "8px 10px", cursor: "pointer", color: C.ink3 }}>
            <RefreshCw size={16} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
          </button>
          {/* Desktop only: show classic form toggle */}
          {!isMobile && (
            <button onClick={() => setShowForm(!showForm)} style={{ background: C.green500, color: C.green900, border: "none", borderRadius: 12, padding: "8px 18px", fontWeight: 800, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}>
              + Nova meta
            </button>
          )}
          {/* Mobile only: open onboarding */}
          {isMobile && (
            <button onClick={() => { setShowOnboarding(true); setOnboardingStep(1); }} style={{ background: C.green500, color: C.green900, border: "none", borderRadius: 12, padding: "8px 18px", fontWeight: 800, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}>
              + Nova
            </button>
          )}
        </div>
      </div>

      {/* Desktop form */}
      {showForm && !isMobile && (
        <form onSubmit={save} style={{ background: C.green50, borderRadius: 20, padding: 24, marginBottom: 28, border: `1.5px solid ${C.green100}` }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: C.green900, marginBottom: 20, marginTop: 0 }}>➕ Nova meta</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="label">Nome da meta</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Reserva de emergência, Viagem Europa..." className="input" maxLength={100} />
            </div>
            <div>
              <label className="label">Valor alvo (R$)</label>
              <input type="number" value={valorAlvo} onChange={e => setValorAlvo(e.target.value)}
                placeholder="10000" min="1" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">Já tenho (R$)</label>
              <input type="number" value={valorAtual} onChange={e => setValorAtual(e.target.value)}
                placeholder="0" min="0" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">Prazo (meses)</label>
              <input type="number" value={prazo} onChange={e => setPrazo(e.target.value)}
                min="1" max="600" className="input" />
            </div>
            {aporteEstimado !== null && !isNaN(aporteEstimado) && aporteEstimado > 0 && (
              <div style={{ background: "#fff", border: `1.5px solid ${C.green100}`, borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Aporte mensal</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: C.green500, margin: 0 }}>R$ {fmtInt(aporteEstimado)}</p>
              </div>
            )}
          </div>
          {formError && <p className="text-xs text-red-500 mb-3">⚠ {formError}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, background: C.green900, color: "#fff", border: "none", borderRadius: 14, padding: "13px 0", fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Salvando..." : "💾 Criar meta"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: "#fff", color: C.ink2, border: `1.5px solid ${C.divider}`, borderRadius: 14, padding: "13px 20px", fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Grid de metas */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ height: 160, borderRadius: 20, background: C.green50, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ background: C.green50, borderRadius: 20, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <p style={{ fontWeight: 800, color: C.green900, margin: "0 0 6px" }}>Nenhuma meta ainda</p>
          <p style={{ fontSize: 13, color: C.ink3, margin: "0 0 20px" }}>Crie sua primeira meta financeira.</p>
          <button onClick={() => isMobile ? (setShowOnboarding(true), setOnboardingStep(1)) : setShowForm(true)}
            style={{ background: C.green500, color: C.green900, border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 800, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}>
            + Criar meta
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {sorted.map(meta => {
            const ap = calcAporte(meta);
            const pct = meta.valor_alvo > 0 ? Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100)) : 0;
            return (
              <div key={meta.id}>
                <div
                  onClick={() => isMobile && router.push(`/dashboard/metas/${meta.id}`)}
                  style={{ cursor: isMobile ? "pointer" : "default" }}
                >
                  <GoalCard
                    title={meta.concluida ? `🎉 ${meta.nome}` : meta.nome}
                    emoji={meta.concluida ? "✨" : metaEmoji(meta.nome)}
                    current={fmtInt(meta.valor_atual)}
                    target={meta.concluida ? undefined : fmtInt(meta.valor_alvo)}
                    pct={pct}
                    statusLeft={statusLeft(meta)}
                    statusRight={statusRight(meta, ap)}
                    tone={tone(meta)}
                  />
                </div>
                {/* Action buttons: desktop only */}
                {!isMobile && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px 0" }}>
                    <div style={{ display: "flex", gap: 2 }}>
                      {!meta.concluida && (
                        <button onClick={() => togglePrincipal(meta)} title={meta.principal ? "Remover principal" : "Marcar como principal"}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: meta.principal ? "#f59e0b" : C.ink3 }}>
                          <Star size={14} fill={meta.principal ? "currentColor" : "none"} />
                        </button>
                      )}
                      <button onClick={() => toggleConcluida(meta)} title={meta.concluida ? "Reabrir" : "Concluir"}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: meta.concluida ? C.green500 : C.ink3 }}>
                        <CheckCircle2 size={14} />
                      </button>
                      <button onClick={() => remove(meta.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: C.ink3 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {!meta.concluida && (
                      <div style={{ display: "flex", gap: 5 }}>
                        {[50, 100, 500].map(v => (
                          <button key={v} onClick={() => updateValorAtual(meta, Math.min(meta.valor_alvo, meta.valor_atual + v))}
                            style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT, background: C.green50, border: `1.5px solid ${C.green100}`, color: "#15803d", padding: "4px 8px", borderRadius: 7, cursor: "pointer" }}>
                            +{fmtInt(v)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
