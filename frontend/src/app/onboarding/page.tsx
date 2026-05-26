"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

const STEPS = [
  { id: 1, titulo: "Conta criada! 🎉", subtitulo: "Vamos configurar seu perfil financeiro" },
  { id: 2, titulo: "Qual sua renda mensal?", subtitulo: "Usamos isso para personalizar suas análises" },
  { id: 3, titulo: "Defina sua primeira meta", subtitulo: "O que você quer conquistar?" },
  { id: 4, titulo: "Radiografia Financeira 🩻", subtitulo: "5 perguntas rápidas para seu diagnóstico personalizado" },
];

const METAS_SUGERIDAS = [
  { emoji: "🏖️", label: "Viagem dos sonhos" },
  { emoji: "🚗", label: "Comprar um carro" },
  { emoji: "🏠", label: "Entrada do imóvel" },
  { emoji: "🛡️", label: "Reserva de emergência" },
  { emoji: "📈", label: "Começar a investir" },
  { emoji: "💳", label: "Sair das dívidas" },
];

const PERGUNTAS = [
  {
    id: 1,
    texto: "Como você se sente quando pensa em dinheiro?",
    opcoes: ["😰 Ansioso", "😌 Tranquilo", "😕 Perdido", "🔥 Motivado"],
  },
  {
    id: 2,
    texto: "Qual seu maior desafio financeiro hoje?",
    opcoes: ["💳 Dívidas", "🐷 Guardar dinheiro", "🔍 Entender onde gasto", "📈 Investir"],
  },
  {
    id: 3,
    texto: "Você tem reserva de emergência?",
    opcoes: ["❌ Não tenho", "📦 Menos de 3 meses", "✅ 3–6 meses", "🏆 Mais de 6 meses"],
  },
  {
    id: 4,
    texto: "Como você costuma lidar com uma conta inesperada?",
    opcoes: ["💳 Cartão de crédito", "🤝 Peço emprestado", "🏦 Uso minha reserva", "😟 Fico sem pagar"],
  },
  {
    id: 5,
    texto: "Qual é seu objetivo principal agora?",
    opcoes: ["🚀 Sair das dívidas", "🛡️ Criar reserva", "📈 Investir", "✈️ Viajar / realizar sonho"],
  },
];

interface Diagnostico {
  perfil_nome: string;
  perfil_emoji: string;
  descricao: string;
  prioridades: string[];
  score: number;
  frase_motivacional: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState("");
  const [ocupacao, setOcupacao] = useState("");
  const [renda, setRenda] = useState("");
  const [metaNome, setMetaNome] = useState("");
  const [metaValor, setMetaValor] = useState("");
  const [metaMeses, setMetaMeses] = useState("12");
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [compartilhado, setCompartilhado] = useState(false);

  async function salvarPerfil(userId: string) {
    await supabase.from("user_profiles").upsert({
      id: userId,
      user_id: userId, // garante consistência com o campo usado no restante do app
      nome,
      ocupacao,
      renda_mensal: parseFloat(renda) || 0,
      updated_at: new Date().toISOString(),
    });
    if (metaNome && metaValor) {
      await supabase.from("metas").insert({
        user_id: userId,
        nome: metaNome,
        valor_alvo: parseFloat(metaValor) || 0,
        valor_atual: 0,
        prazo_meses: parseInt(metaMeses) || 12,
        concluida: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  async function avancar() {
    if (step < 4) { setStep(step + 1); return; }
    await gerarRadiografia();
  }

  async function gerarRadiografia() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      await salvarPerfil(user.id);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/onboarding/diagnostico", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ respostas, nome, ocupacao, renda: parseFloat(renda) || 0, meta: metaNome }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar diagnóstico");
      setDiagnostico(data.diagnostico);
    } catch (e) {
      console.error("[RADIOGRAFIA]", e);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("user_profiles").update({ onboarding_completo: true }).eq("id", user.id);
      router.push("/dashboard?onboarding=1");
    } finally {
      setLoading(false);
    }
  }

  async function pularRadiografia() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      await salvarPerfil(user.id);
      await supabase.from("user_profiles").update({ onboarding_completo: true }).eq("id", user.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("diagnostico_json")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.diagnostico_json?.score_imoney) {
        router.push("/dashboard?onboarding=1");
      } else {
        router.push("/dashboard/diagnostico");
      }
    } catch (e) {
      console.error(e);
      router.push("/dashboard/diagnostico");
    } finally {
      setLoading(false);
    }
  }

  async function irParaDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_profiles").update({
        onboarding_completo: true,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("diagnostico_json")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.diagnostico_json?.score_imoney) {
        router.push("/dashboard?onboarding=1");
      } else {
        router.push("/dashboard/diagnostico");
      }
    } else {
      router.push("/dashboard?onboarding=1");
    }
  }

  async function compartilharPerfil() {
    if (!diagnostico) return;
    const texto = `🧭 Minha Radiografia Financeira no iMoney\n\n${diagnostico.perfil_emoji} ${diagnostico.perfil_nome}\nScore de Saúde: ${diagnostico.score}/1000\n\n"${diagnostico.frase_motivacional}"\n\nDescubra o seu em imoney.ia.br 💚`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Meu Perfil iMoney", text: texto });
      } else {
        await navigator.clipboard.writeText(texto);
      }
      setCompartilhado(true);
      setTimeout(() => setCompartilhado(false), 3000);
    } catch { /* user cancelled share */ }
  }

  const progresso = (step / STEPS.length) * 100;
  const stepAtual = STEPS[step - 1];
  const todasRespondidas = Object.keys(respostas).length === PERGUNTAS.length;
  const podeContinuar =
    (step === 1 && nome.trim().length > 1) ||
    (step === 2 && parseFloat(renda) > 0) ||
    (step === 3) ||
    (step === 4 && todasRespondidas);

  // Results screen
  if (diagnostico) {
    const scorePct = Math.min(100, (diagnostico.score / 1000) * 100);
    const scoreColor = diagnostico.score < 400 ? "#ef4444" : diagnostico.score < 650 ? "#f59e0b" : "#1D9E75";

    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a3d28 0%, #1D9E75 100%)",
        fontFamily: "'Nunito',sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 56px",
        overflowY: "auto",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
          @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          @keyframes scoreGrow { from{width:0%} to{width:${scorePct}%} }
          .r-fade { animation: fadeUp 0.5s ease forwards; opacity: 0; }
          .score-bar-fill { animation: scoreGrow 1.2s ease 0.6s forwards; width: 0%; }
        `}</style>

        <div className="r-fade" style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 18px", marginBottom: 28, backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>🩻 Sua Radiografia Financeira</span>
        </div>

        <div className="r-fade" style={{ animationDelay: "0.1s", width: "100%", maxWidth: 440, background: "#fff", borderRadius: 24, padding: "32px 28px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", marginBottom: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 68, lineHeight: 1, marginBottom: 14 }}>{diagnostico.perfil_emoji}</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0a3d28", margin: "0 0 10px", lineHeight: 1.2 }}>{diagnostico.perfil_nome}</h1>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>{diagnostico.descricao}</p>
          </div>

          <div style={{ background: "#f0fdf4", borderRadius: 16, padding: "18px 20px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Score de Saúde Financeira</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                {diagnostico.score}
                <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>/1000</span>
              </span>
            </div>
            <div style={{ height: 12, background: "#e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              <div className="score-bar-fill" style={{ height: "100%", background: `linear-gradient(90deg, ${scoreColor}99, ${scoreColor})`, borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Iniciante</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Saudável</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Expert</span>
            </div>
          </div>
        </div>

        <div className="r-fade" style={{ animationDelay: "0.2s", width: "100%", maxWidth: 440, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, textAlign: "center" }}>
            📌 Prioridades para os próximos 30 dias
          </p>
          {diagnostico.prioridades.map((p, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(10px)",
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 10,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              border: "1px solid rgba(255,255,255,0.18)",
            }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff", flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 600, lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>

        <div className="r-fade" style={{ animationDelay: "0.3s", width: "100%", maxWidth: 440, background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
          <p style={{ fontSize: 15, color: "#d1fae5", fontStyle: "italic", margin: 0, lineHeight: 1.7, fontWeight: 600 }}>
            &ldquo;{diagnostico.frase_motivacional}&rdquo;
          </p>
        </div>

        <div className="r-fade" style={{ animationDelay: "0.4s", width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={compartilharPerfil} style={{
            padding: "16px 0", borderRadius: 14, border: "2px solid rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 15, fontWeight: 800,
            cursor: "pointer", fontFamily: "'Nunito',sans-serif", backdropFilter: "blur(10px)", transition: "all 0.2s",
          }}>
            {compartilhado ? "✅ Copiado! Compartilhe nas suas redes" : "📤 Compartilhar meu perfil"}
          </button>
          <button onClick={irParaDashboard} style={{
            padding: "16px 0", borderRadius: 14, border: "none", background: "#fff",
            color: "#0a3d28", fontSize: 15, fontWeight: 800, cursor: "pointer",
            fontFamily: "'Nunito',sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.2s",
          }}>
            Ir para o Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4 0%, #fff 60%)", fontFamily: "'Nunito',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: step === 4 ? "flex-start" : "center", padding: "24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .step { animation: fadeIn 0.3s ease; }
        input, select { outline: none; }
        input:focus, select:focus { border-color: #1D9E75 !important; box-shadow: 0 0 0 3px rgba(29,158,117,0.1); }
      `}</style>

      <div style={{ marginBottom: 28, textAlign: "center", marginTop: step === 4 ? 24 : 0 }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>🧭</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#0a3d28" }}>iMoney</div>
      </div>

      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ height: 4, background: "#f0f0f0" }}>
          <div style={{ height: "100%", width: `${progresso}%`, background: "#1D9E75", transition: "width 0.4s ease", borderRadius: 4 }} />
        </div>

        <div className="step" key={step} style={{ padding: "36px 32px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
            {STEPS.map(s => (
              <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, background: s.id <= step ? "#1D9E75" : "#f0f0f0", transition: "background 0.3s" }} />
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0d2414", margin: "0 0 6px", lineHeight: 1.3 }}>{stepAtual.titulo}</h1>
            <p style={{ fontSize: 14, color: "#888", margin: 0, lineHeight: 1.6 }}>{stepAtual.subtitulo}</p>
          </div>

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

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {PERGUNTAS.map(p => (
                <div key={p.id}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#0d2414", margin: "0 0 10px", lineHeight: 1.4 }}>
                    <span style={{ color: "#1D9E75", marginRight: 4 }}>{p.id}.</span>{p.texto}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {p.opcoes.map(opcao => (
                      <button key={opcao} onClick={() => setRespostas(prev => ({ ...prev, [p.id]: opcao }))}
                        style={{
                          padding: "12px 10px", borderRadius: 12,
                          border: `2px solid ${respostas[p.id] === opcao ? "#1D9E75" : "#e8ede8"}`,
                          background: respostas[p.id] === opcao ? "#E1F5EE" : "#fff",
                          color: respostas[p.id] === opcao ? "#085041" : "#444",
                          fontSize: 13, fontWeight: 700, cursor: "pointer",
                          fontFamily: "'Nunito',sans-serif", textAlign: "left", lineHeight: 1.4, transition: "all 0.15s",
                        }}>
                        {opcao}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {todasRespondidas && (
                <p style={{ fontSize: 13, color: "#1D9E75", textAlign: "center", margin: 0, fontWeight: 700 }}>
                  ✅ Perfeito! Clique abaixo para gerar sua radiografia.
                </p>
              )}
            </div>
          )}

          <button onClick={avancar} disabled={!podeContinuar || loading}
            style={{ width: "100%", marginTop: 28, padding: "16px 0", borderRadius: 14, border: "none", background: podeContinuar && !loading ? "#1D9E75" : "#e8ede8", color: podeContinuar && !loading ? "#fff" : "#aaa", fontSize: 16, fontWeight: 800, cursor: podeContinuar && !loading ? "pointer" : "not-allowed", fontFamily: "'Nunito',sans-serif", transition: "all 0.2s", boxShadow: podeContinuar && !loading ? "0 4px 20px rgba(29,158,117,0.3)" : "none" }}>
            {loading ? "Gerando sua radiografia... 🩻" : step === 4 ? "Gerar minha Radiografia 🩻" : "Continuar →"}
          </button>

          {step === 3 && (
            <button onClick={() => setStep(4)} style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 12, border: "none", background: "transparent", color: "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>
              Pular meta →
            </button>
          )}
          {step === 4 && (
            <button onClick={pularRadiografia} disabled={loading} style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 12, border: "none", background: "transparent", color: "#aaa", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Nunito',sans-serif" }}>
              Pular por agora
            </button>
          )}
        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: "#aaa" }}>Seus dados são privados e protegidos 🔒</p>
    </div>
  );
}
