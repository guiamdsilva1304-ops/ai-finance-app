"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

const RESERVA_OPCOES = [
  { label: "❌ Não tenho", value: "Não tenho reserva" },
  { label: "📦 Tenho um pouco", value: "Menos de 3 meses" },
  { label: "✅ 3+ meses", value: "3 ou mais meses" },
];

const OBJETIVO_OPCOES = [
  { label: "💳 Sair das dívidas", value: "Sair das dívidas" },
  { label: "💰 Guardar dinheiro", value: "Guardar dinheiro" },
  { label: "📈 Começar a investir", value: "Começar a investir" },
  { label: "🏠 Comprar imóvel", value: "Comprar imóvel" },
  { label: "🧓 Aposentadoria", value: "Aposentadoria" },
];

const RENDA_RAPIDA = ["1500", "3000", "5000", "8000", "12000", "20000"];

export default function DiagnosticoPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [renda, setRenda] = useState("");
  const [gastos, setGastos] = useState("");
  const [temDivida, setTemDivida] = useState<boolean | null>(null);
  const [valorDivida, setValorDivida] = useState("");
  const [reserva, setReserva] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const totalSteps = 5;
  const progresso = (step / totalSteps) * 100;

  function podeProsseguir() {
    if (step === 1) return parseFloat(renda) > 0;
    if (step === 2) return parseFloat(gastos) >= 0;
    if (step === 3) return temDivida !== null;
    if (step === 4) return reserva !== "";
    if (step === 5) return objetivo !== "";
    return false;
  }

  async function handleProximo() {
    if (step < totalSteps) { setStep(s => s + 1); return; }
    await gerarScore();
  }

  async function gerarScore() {
    setLoading(true);
    setErro("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const res = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          renda: parseFloat(renda),
          gastos: parseFloat(gastos) || 0,
          tem_divida: temDivida,
          valor_divida: temDivida ? parseFloat(valorDivida) || 0 : 0,
          reserva,
          objetivo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar score");
      router.push("/dashboard/score");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  const stepTitulos = [
    "Qual é sua renda mensal?",
    "Quanto você gasta por mês?",
    "Você tem dívidas?",
    "Você tem reserva de emergência?",
    "Qual seu objetivo principal?",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fdf9", fontFamily: "'Nunito',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .diag-step { animation: fadeIn 0.3s ease; }
        input:focus { outline: none; border-color: #1D9E75 !important; box-shadow: 0 0 0 3px rgba(29,158,117,0.12); }
      `}</style>

      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🎯</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a3d28", margin: 0 }}>Score iMoney</h1>
          <p style={{ fontSize: 14, color: "#6b9e80", margin: "6px 0 0" }}>Descubra sua saúde financeira em 5 perguntas</p>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {/* Progress bar */}
          <div style={{ height: 4, background: "#f0f0f0" }}>
            <div style={{ height: "100%", width: `${progresso}%`, background: "#1D9E75", transition: "width 0.4s ease" }} />
          </div>

          <div className="diag-step" key={step} style={{ padding: "32px 28px 28px" }}>
            {/* Step dots */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? "#1D9E75" : "#f0f0f0", transition: "background 0.3s" }} />
              ))}
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
              Pergunta {step} de {totalSteps}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0d2414", margin: "0 0 24px", lineHeight: 1.3 }}>
              {stepTitulos[step - 1]}
            </h2>

            {/* Step 1 — Renda */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 700, color: "#9ca3af" }}>R$</span>
                  <input
                    value={renda}
                    onChange={e => setRenda(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    type="number"
                    min="0"
                    autoFocus
                    style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "13px 16px 13px 44px", fontSize: 16, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", transition: "border 0.2s" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {RENDA_RAPIDA.map(v => (
                    <button key={v} onClick={() => setRenda(v)}
                      style={{ padding: "10px 6px", borderRadius: 10, border: `2px solid ${renda === v ? "#1D9E75" : "#e8ede8"}`, background: renda === v ? "#E1F5EE" : "#fff", color: renda === v ? "#085041" : "#666", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif", transition: "all 0.15s" }}>
                      R$ {parseInt(v).toLocaleString("pt-BR")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 — Gastos */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 13, color: "#6b9e80", margin: "0 0 4px" }}>Inclua aluguel, mercado, contas fixas, transporte…</p>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 700, color: "#9ca3af" }}>R$</span>
                  <input
                    value={gastos}
                    onChange={e => setGastos(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    type="number"
                    min="0"
                    autoFocus
                    style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "13px 16px 13px 44px", fontSize: 16, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", transition: "border 0.2s" }}
                  />
                </div>
                {renda && gastos && (
                  <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#374151", fontWeight: 600 }}>
                    Sobra mensal estimada: <span style={{ color: parseFloat(renda) - parseFloat(gastos) >= 0 ? "#16a34a" : "#ef4444", fontWeight: 900 }}>
                      R$ {(parseFloat(renda) - parseFloat(gastos)).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Dívidas */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[{ label: "✅ Não tenho", value: false }, { label: "💳 Sim, tenho", value: true }].map(opt => (
                    <button key={String(opt.value)} onClick={() => setTemDivida(opt.value)}
                      style={{ padding: "18px 12px", borderRadius: 14, border: `2px solid ${temDivida === opt.value ? "#1D9E75" : "#e8ede8"}`, background: temDivida === opt.value ? "#E1F5EE" : "#fff", color: temDivida === opt.value ? "#085041" : "#444", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif", transition: "all 0.15s" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {temDivida && (
                  <div style={{ marginTop: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>VALOR TOTAL APROXIMADO (R$)</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: "#9ca3af" }}>R$</span>
                      <input
                        value={valorDivida}
                        onChange={e => setValorDivida(e.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        type="number"
                        min="0"
                        style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px 12px 44px", fontSize: 15, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", transition: "border 0.2s" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 — Reserva */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {RESERVA_OPCOES.map(opt => (
                  <button key={opt.value} onClick={() => setReserva(opt.value)}
                    style={{ padding: "16px 18px", borderRadius: 14, border: `2px solid ${reserva === opt.value ? "#1D9E75" : "#e8ede8"}`, background: reserva === opt.value ? "#E1F5EE" : "#fff", color: reserva === opt.value ? "#085041" : "#444", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif", textAlign: "left", transition: "all 0.15s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Step 5 — Objetivo */}
            {step === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {OBJETIVO_OPCOES.map(opt => (
                  <button key={opt.value} onClick={() => setObjetivo(opt.value)}
                    style={{ padding: "14px 18px", borderRadius: 14, border: `2px solid ${objetivo === opt.value ? "#1D9E75" : "#e8ede8"}`, background: objetivo === opt.value ? "#E1F5EE" : "#fff", color: objetivo === opt.value ? "#085041" : "#444", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif", textAlign: "left", transition: "all 0.15s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {erro && (
              <div style={{ marginTop: 16, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, fontSize: 13, color: "#ef4444", fontWeight: 600 }}>
                {erro}
              </div>
            )}

            <button
              onClick={handleProximo}
              disabled={!podeProsseguir() || loading}
              style={{ width: "100%", marginTop: 24, padding: "16px 0", borderRadius: 14, border: "none", background: podeProsseguir() && !loading ? "#1D9E75" : "#e8ede8", color: podeProsseguir() && !loading ? "#fff" : "#aaa", fontSize: 16, fontWeight: 800, cursor: podeProsseguir() && !loading ? "pointer" : "not-allowed", fontFamily: "'Nunito',sans-serif", transition: "all 0.2s", boxShadow: podeProsseguir() && !loading ? "0 4px 20px rgba(29,158,117,0.3)" : "none" }}>
              {loading
                ? "Analisando sua situação financeira... 🔍"
                : step === totalSteps
                  ? "Gerar meu Score iMoney 🎯"
                  : "Próximo →"}
            </button>

            {step > 1 && !loading && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 12, border: "none", background: "transparent", color: "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>
                ← Voltar
              </button>
            )}
          </div>
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>Seus dados são privados e protegidos 🔒</p>
      </div>
    </div>
  );
}
