"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

const STEPS = [
  { id: 1, titulo: "Conta criada! 🎉", subtitulo: "Vamos configurar seu perfil financeiro" },
  { id: 2, titulo: "Qual sua renda mensal?", subtitulo: "Usamos isso para personalizar suas análises" },
  { id: 3, titulo: "Defina sua primeira meta", subtitulo: "O que você quer conquistar nos próximos meses?" },
];

const METAS_SUGERIDAS = [
  { emoji: "🏖️", label: "Viagem dos sonhos" },
  { emoji: "🚗", label: "Comprar um carro" },
  { emoji: "🏠", label: "Entrada do imóvel" },
  { emoji: "🛡️", label: "Reserva de emergência" },
  { emoji: "📈", label: "Começar a investir" },
  { emoji: "💳", label: "Sair das dívidas" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — perfil
  const [nome, setNome] = useState("");
  const [ocupacao, setOcupacao] = useState("");

  // Step 2 — renda
  const [renda, setRenda] = useState("");

  // Step 3 — meta
  const [metaNome, setMetaNome] = useState("");
  const [metaValor, setMetaValor] = useState("");
  const [metaMeses, setMetaMeses] = useState("12");

  async function avancar() {
    if (step < 3) { setStep(step + 1); return; }
    await finalizar();
  }

  async function finalizar() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Salva perfil
      await supabase.from("user_profiles").upsert({
        id: user.id,
        nome,
        ocupacao,
        renda_mensal: parseFloat(renda) || 0,
        onboarding_completo: true,
        updated_at: new Date().toISOString(),
      });

      // Cria meta se preenchida
      if (metaNome && metaValor) {
        await supabase.from("metas").insert({
          user_id: user.id,
          nome: metaNome,
          valor_alvo: parseFloat(metaValor) || 0,
          valor_atual: 0,
          prazo_meses: parseInt(metaMeses) || 12,
          concluida: false,
          created_at: new Date().toISOString(),
        });
      }

      router.push("/dashboard?onboarding=1");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const progresso = (step / 3) * 100;
  const stepAtual = STEPS[step - 1];
  const podeContinuar =
    (step === 1 && nome.trim().length > 1) ||
    (step === 2 && parseFloat(renda) > 0) ||
    (step === 3);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4 0%, #fff 60%)", fontFamily: "'Nunito',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .step { animation: fadeIn 0.3s ease; }
        input, select { outline: none; }
        input:focus, select:focus { border-color: #1D9E75 !important; box-shadow: 0 0 0 3px rgba(29,158,117,0.1); }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>🧭</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#0a3d28" }}>iMoney</div>
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", overflow: "hidden" }}>

        {/* Progress bar */}
        <div style={{ height: 4, background: "#f0f0f0" }}>
          <div style={{ height: "100%", width: `${progresso}%`, background: "#1D9E75", transition: "width 0.4s ease", borderRadius: 4 }} />
        </div>

        <div className="step" key={step} style={{ padding: "36px 32px" }}>
          {/* Step indicator */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
            {STEPS.map(s => (
              <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, background: s.id <= step ? "#1D9E75" : "#f0f0f0", transition: "background 0.3s" }} />
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0d2414", margin: "0 0 6px", lineHeight: 1.3 }}>{stepAtual.titulo}</h1>
            <p style={{ fontSize: 14, color: "#888", margin: 0, lineHeight: 1.6 }}>{stepAtual.subtitulo}</p>
          </div>

          {/* Step 1 — Perfil */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>SEU NOME</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Como você quer ser chamado?" autoFocus
                  style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", transition: "border 0.2s" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>OCUPAÇÃO</label>
                <select value={ocupacao} onChange={e => setOcupacao(e.target.value)}
                  style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "'Nunito',sans-serif", color: ocupacao ? "#1a1a1a" : "#aaa", boxSizing: "border-box", background: "#fff", transition: "border 0.2s" }}>
                  <option value="">Selecione sua ocupação</option>
                  <option value="clt">CLT (funcionário)</option>
                  <option value="autonomo">Autônomo / Freelancer</option>
                  <option value="empresario">Empresário</option>
                  <option value="estudante">Estudante</option>
                  <option value="servidor">Servidor público</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2 — Renda */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>RENDA MENSAL APROXIMADA</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 700, color: "#aaa" }}>R$</span>
                  <input value={renda} onChange={e => setRenda(e.target.value.replace(/\D/g, ""))} placeholder="0" autoFocus type="number" min="0"
                    style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px 12px 44px", fontSize: 15, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", transition: "border 0.2s" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {["1500", "3000", "5000", "8000", "12000", "20000"].map(v => (
                  <button key={v} onClick={() => setRenda(v)}
                    style={{ padding: "10px 0", borderRadius: 10, border: `2px solid ${renda === v ? "#1D9E75" : "#e8ede8"}`, background: renda === v ? "#E1F5EE" : "#fff", color: renda === v ? "#085041" : "#666", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif", transition: "all 0.2s" }}>
                    R$ {parseInt(v).toLocaleString("pt-BR")}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "#aaa", margin: 0, textAlign: "center" }}>Só usamos isso para personalizar suas análises. Pode aproximar.</p>
            </div>
          )}

          {/* Step 3 — Meta */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {METAS_SUGERIDAS.map(m => (
                  <button key={m.label} onClick={() => setMetaNome(m.label)}
                    style={{ padding: "10px 12px", borderRadius: 10, border: `2px solid ${metaNome === m.label ? "#1D9E75" : "#e8ede8"}`, background: metaNome === m.label ? "#E1F5EE" : "#fff", color: metaNome === m.label ? "#085041" : "#444", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
                    <span style={{ fontSize: 18 }}>{m.emoji}</span> {m.label}
                  </button>
                ))}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>OU ESCREVA SUA PRÓPRIA META</label>
                <input value={metaNome} onChange={e => setMetaNome(e.target.value)} placeholder="Ex: Fazer uma viagem para Europa"
                  style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", transition: "border 0.2s" }} />
              </div>
              {metaNome && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>VALOR (R$)</label>
                    <input value={metaValor} onChange={e => setMetaValor(e.target.value)} placeholder="0" type="number" min="0"
                      style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", transition: "border 0.2s" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6 }}>PRAZO</label>
                    <select value={metaMeses} onChange={e => setMetaMeses(e.target.value)}
                      style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", background: "#fff", transition: "border 0.2s" }}>
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">1 ano</option>
                      <option value="24">2 anos</option>
                      <option value="36">3 anos</option>
                      <option value="60">5 anos</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão */}
          <button onClick={avancar} disabled={!podeContinuar || loading}
            style={{ width: "100%", marginTop: 28, padding: "16px 0", borderRadius: 14, border: "none", background: podeContinuar && !loading ? "#1D9E75" : "#e8ede8", color: podeContinuar && !loading ? "#fff" : "#aaa", fontSize: 16, fontWeight: 800, cursor: podeContinuar && !loading ? "pointer" : "not-allowed", fontFamily: "'Nunito',sans-serif", transition: "all 0.2s", boxShadow: podeContinuar && !loading ? "0 4px 20px rgba(29,158,117,0.3)" : "none" }}>
            {loading ? "Salvando..." : step === 3 ? "Entrar no iMoney 🚀" : "Continuar →"}
          </button>

          {step === 3 && (
            <button onClick={() => router.push("/dashboard")} style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 12, border: "none", background: "transparent", color: "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>
              Pular por agora
            </button>
          )}
        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: "#aaa" }}>Seus dados são privados e protegidos 🔒</p>
    </div>
  );
}
