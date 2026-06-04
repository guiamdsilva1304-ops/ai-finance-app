"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";

const STEPS = [
  { id: 1, titulo: "Qual é o seu grande sonho? 🌟", subtitulo: "Vamos começar pelo que mais importa pra você" },
  { id: 2, titulo: "Agora, vamos te conhecer", subtitulo: "Para o plano ser feito pra você" },
  { id: 3, titulo: "Sua renda e gastos 💰", subtitulo: "Calcula quanto sobra por mês pra você" },
  { id: 4, titulo: "Vamos montar seu plano", subtitulo: "A iMoney já calcula quanto você precisa guardar" },
  { id: 5, titulo: "Radiografia Financeira 🩻", subtitulo: "5 perguntas rápidas para seu diagnóstico personalizado" },
];

const SONHOS = [
  { emoji: "🏠", label: "Casa própria",            descricao: "Comprar ou dar entrada no imóvel" },
  { emoji: "✈️", label: "Viagem dos sonhos",       descricao: "Aquela viagem que você sempre quis fazer" },
  { emoji: "🚗", label: "Meu primeiro carro",      descricao: "Comprar um carro novo ou seminovo" },
  { emoji: "🛡️", label: "Reserva de emergência",   descricao: "Sair do limite de uma vez por todas" },
  { emoji: "📈", label: "Independência financeira", descricao: "Investir e viver de renda no futuro" },
  { emoji: "🎓", label: "Educação / pós-grad",     descricao: "Dar o próximo passo na carreira" },
  { emoji: "💳", label: "Sair das dívidas",        descricao: "Zerar as dívidas e recomeçar do zero" },
  { emoji: "✨", label: "Outro sonho",             descricao: "Você digita o que quiser" },
];

const PERGUNTAS = [
  { id: 1, texto: "Como você se sente quando pensa em dinheiro?",   opcoes: ["😰 Ansioso", "😌 Tranquilo", "😕 Perdido", "🔥 Motivado"] },
  { id: 2, texto: "Qual seu maior desafio financeiro hoje?",        opcoes: ["💳 Dívidas", "🐷 Guardar dinheiro", "🔍 Entender onde gasto", "📈 Investir"] },
  { id: 3, texto: "Você tem reserva de emergência?",                opcoes: ["❌ Não tenho", "📦 Menos de 3 meses", "✅ 3–6 meses", "🏆 Mais de 6 meses"] },
  { id: 4, texto: "Como você lida com uma conta inesperada?",       opcoes: ["💳 Cartão de crédito", "🤝 Peço emprestado", "🏦 Uso minha reserva", "😟 Fico sem pagar"] },
  { id: 5, texto: "Qual é seu objetivo principal agora?",           opcoes: ["🚀 Sair das dívidas", "🛡️ Criar reserva", "📈 Investir", "✈️ Viajar / realizar sonho"] },
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
  const [sonhoSelecionado, setSonhoSelecionado] = useState<string>("");
  const [sonhoCustom, setSonhoCustom] = useState("");
  const [nome, setNome] = useState("");
  const [ocupacao, setOcupacao] = useState("");
  const [renda, setRenda] = useState("");
  const [gastos, setGastos] = useState("");
  const [metaValor, setMetaValor] = useState("");
  const [metaMeses, setMetaMeses] = useState("12");
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [compartilhado, setCompartilhado] = useState(false);

  const sonhoEhOutro = sonhoSelecionado === "✨ Outro sonho";
  const metaNome = sonhoEhOutro ? sonhoCustom : sonhoSelecionado;

  const rendaNum = parseFloat(renda) || 0;
  const gastosNum = parseFloat(gastos) || 0;
  const monthlyAvailable = rendaNum - gastosNum;

  // ── Cálculo da meta em tempo real ────────────────────────────────────────
  const calculo = useMemo(() => {
    const v = parseFloat(metaValor);
    const m = parseInt(metaMeses);
    if (!v || !m) return null;
    const porMes = v / m;
    const pctRenda = rendaNum > 0 ? (porMes / rendaNum) * 100 : null;
    return { porMes, pctRenda, viavel: pctRenda === null || pctRenda <= 50 };
  }, [metaValor, metaMeses, rendaNum]);

  async function salvarPerfil(userId: string) {
    const monthly = rendaNum - gastosNum;
    await supabase.from("user_profiles").upsert({
      id: userId,
      user_id: userId,
      nome,
      ocupacao,
      renda_mensal: rendaNum,
      gastos_mensais: gastosNum,
      monthly_available: monthly,
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
    if (step < 5) { setStep(step + 1); return; }
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ respostas, nome, ocupacao, renda: rendaNum, gastos: gastosNum, monthly_available: monthlyAvailable, meta: metaNome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar diagnóstico");
      setDiagnostico(data.diagnostico);
    } catch (e) {
      console.error("[RADIOGRAFIA]", e);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("user_profiles").update({ onboarding_completo: true }).eq("id", user.id);
      router.push("/dashboard?onboarding=1");
    } finally { setLoading(false); }
  }

  async function pularRadiografia() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      await salvarPerfil(user.id);
      await supabase.from("user_profiles").update({ onboarding_completo: true }).eq("id", user.id);
      const { data: profile } = await supabase.from("user_profiles").select("diagnostico_json").eq("id", user.id).maybeSingle();
      router.push(profile?.diagnostico_json?.score_imoney ? "/dashboard?onboarding=1" : "/dashboard/diagnostico");
    } catch (e) { console.error(e); router.push("/dashboard/diagnostico"); }
    finally { setLoading(false); }
  }

  async function irParaDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_profiles").update({ onboarding_completo: true, updated_at: new Date().toISOString() }).eq("id", user.id);
      const { data: profile } = await supabase.from("user_profiles").select("diagnostico_json").eq("id", user.id).maybeSingle();
      router.push(profile?.diagnostico_json?.score_imoney ? "/dashboard?onboarding=1" : "/dashboard/diagnostico");
    } else { router.push("/dashboard?onboarding=1"); }
  }

  async function compartilharPerfil() {
    if (!diagnostico) return;
    const texto = `🧭 Minha Radiografia Financeira no iMoney\n\n${diagnostico.perfil_emoji} ${diagnostico.perfil_nome}\nScore de Saúde: ${diagnostico.score}/1000\n\n"${diagnostico.frase_motivacional}"\n\nDescubra o seu em imoney.ia.br 💚`;
    try {
      if (navigator.share) { await navigator.share({ title: "Meu Perfil iMoney", text: texto }); }
      else { await navigator.clipboard.writeText(texto); }
      setCompartilhado(true); setTimeout(() => setCompartilhado(false), 3000);
    } catch { /* cancelled */ }
  }

  const progresso = (step / STEPS.length) * 100;
  const stepAtual = STEPS[step - 1];
  const todasRespondidas = Object.keys(respostas).length === PERGUNTAS.length;
  const podeContinuar =
    (step === 1 && sonhoSelecionado && (!sonhoEhOutro || sonhoCustom.trim().length > 1)) ||
    (step === 2 && nome.trim().length > 1) ||
    (step === 3 && renda.trim().length > 0) ||
    (step === 4) ||
    (step === 5 && todasRespondidas);

  // ── Tela de resultado (Radiografia) ────────────────────────────────────
  if (diagnostico) {
    const scorePct = Math.min(100, (diagnostico.score / 1000) * 100);
    const scoreColor = diagnostico.score < 400 ? "#ef4444" : diagnostico.score < 650 ? "#f59e0b" : "#1D9E75";
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0a3d28 0%, #1D9E75 100%)", fontFamily: "'Nunito',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px 56px", overflowY: "auto" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap'); @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes scoreGrow{from{width:0%}to{width:${scorePct}%}} .r-fade{animation:fadeUp 0.5s ease forwards;opacity:0} .score-bar-fill{animation:scoreGrow 1.2s ease 0.6s forwards;width:0%}`}</style>
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
              <span style={{ fontSize: 24, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{diagnostico.score}<span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>/1000</span></span>
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
          <p style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, textAlign: "center" }}>📌 Prioridades para os próximos 30 dias</p>
          {diagnostico.prioridades.map((p, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", borderRadius: 14, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 12, border: "1px solid rgba(255,255,255,0.18)" }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff", flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 600, lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>
        <div className="r-fade" style={{ animationDelay: "0.3s", width: "100%", maxWidth: 440, background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
          <p style={{ fontSize: 15, color: "#d1fae5", fontStyle: "italic", margin: 0, lineHeight: 1.7, fontWeight: 600 }}>&ldquo;{diagnostico.frase_motivacional}&rdquo;</p>
        </div>
        <div className="r-fade" style={{ animationDelay: "0.4s", width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={compartilharPerfil} style={{ padding: "16px 0", borderRadius: 14, border: "2px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif", backdropFilter: "blur(10px)" }}>
            {compartilhado ? "✅ Copiado! Compartilhe nas suas redes" : "📤 Compartilhar meu perfil"}
          </button>
          <button onClick={irParaDashboard} style={{ padding: "16px 0", borderRadius: 14, border: "none", background: "#fff", color: "#0a3d28", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
            Ver meu plano no Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // ── Tela principal ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4 0%, #fff 60%)", fontFamily: "'Nunito',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: step === 5 ? "flex-start" : "center", padding: "24px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap'); @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse-green{0%,100%{box-shadow:0 0 0 0 rgba(29,158,117,0.3)}50%{box-shadow:0 0 0 8px rgba(29,158,117,0)}} @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} .step{animation:fadeIn 0.3s ease} .sonho-btn{transition:all 0.2s ease;cursor:pointer} .sonho-btn:hover{transform:translateY(-2px)} .sonho-btn.selected{animation:pulse-green 1s ease 1} .calculo-box{animation:slideIn 0.3s ease} input,select{outline:none} input:focus,select:focus{border-color:#1D9E75 !important;box-shadow:0 0 0 3px rgba(29,158,117,0.1)}`}</style>

      <div style={{ marginBottom: 24, textAlign: "center", marginTop: step === 5 ? 24 : 0 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🧭</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#0a3d28" }}>iMoney</div>
      </div>

      <div style={{ width: "100%", maxWidth: step === 1 ? 560 : 480, background: "#fff", borderRadius: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ height: 4, background: "#f0f0f0" }}>
          <div style={{ height: "100%", width: `${progresso}%`, background: "#1D9E75", transition: "width 0.4s ease", borderRadius: 4 }} />
        </div>
        <div className="step" key={step} style={{ padding: "36px 32px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
            {STEPS.map(s => (<div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, background: s.id <= step ? "#1D9E75" : "#f0f0f0", transition: "background 0.3s" }} />))}
          </div>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0d2414", margin: "0 0 6px", lineHeight: 1.3 }}>{stepAtual.titulo}</h1>
            <p style={{ fontSize: 14, color: "#888", margin: 0, lineHeight: 1.6 }}>{stepAtual.subtitulo}</p>
          </div>

          {/* ── Step 1: Sonho ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {SONHOS.map(s => {
                  const label = `${s.emoji} ${s.label}`;
                  const isSelected = sonhoSelecionado === label;
                  return (
                    <button key={s.label} onClick={() => setSonhoSelecionado(label)} className={`sonho-btn${isSelected ? " selected" : ""}`} style={{ padding: "14px 12px", borderRadius: 14, border: `2px solid ${isSelected ? "#1D9E75" : "#e8ede8"}`, background: isSelected ? "#E1F5EE" : "#fafffe", textAlign: "left", display: "flex", flexDirection: "column", gap: 4, fontFamily: "'Nunito',sans-serif" }}>
                      <span style={{ fontSize: 24 }}>{s.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isSelected ? "#085041" : "#2d4a2d", lineHeight: 1.2 }}>{s.label}</span>
                      <span style={{ fontSize: 11, color: isSelected ? "#1D9E75" : "#999", lineHeight: 1.3 }}>{s.descricao}</span>
                    </button>
                  );
                })}
              </div>
              {sonhoEhOutro && (
                <input value={sonhoCustom} onChange={e => setSonhoCustom(e.target.value)} placeholder="Descreva seu sonho..." autoFocus style={{ width: "100%", border: "2px solid #1D9E75", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box" }} />
              )}
              {sonhoSelecionado && !sonhoEhOutro && (
                <div style={{ background: "#E1F5EE", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#085041" }}>Ótimo! A iMoney vai montar e executar o plano para: <strong>{sonhoSelecionado}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Perfil ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "10px 14px", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>{sonhoSelecionado.split(" ")[0]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#085041" }}>Sonho: {sonhoEhOutro ? sonhoCustom : sonhoSelecionado.split(" ").slice(1).join(" ")}</span>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>COMO VOCÊ QUER SER CHAMADO?</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" autoFocus style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", transition: "border 0.2s" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>OCUPAÇÃO</label>
                <select value={ocupacao} onChange={e => setOcupacao(e.target.value)} style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontFamily: "'Nunito',sans-serif", color: ocupacao ? "#1a1a1a" : "#aaa", boxSizing: "border-box", background: "#fff", transition: "border 0.2s" }}>
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

          {/* ── Step 3: Renda e Gastos ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Renda mensal */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>RENDA MENSAL (salário + freelas + extras)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 700, color: "#aaa" }}>R$</span>
                  <input value={renda} onChange={e => setRenda(e.target.value.replace(/\D/g, ""))} placeholder="0" autoFocus type="number" min="0" style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px 12px 44px", fontSize: 15, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
                  {["1500", "3000", "5000", "8000", "12000", "20000"].map(v => (
                    <button key={v} onClick={() => setRenda(v)} style={{ padding: "8px 0", borderRadius: 8, border: `1.5px solid ${renda === v ? "#1D9E75" : "#e8ede8"}`, background: renda === v ? "#E1F5EE" : "#fff", color: renda === v ? "#085041" : "#666", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif", transition: "all 0.15s" }}>
                      R${parseInt(v).toLocaleString("pt-BR")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gastos mensais */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>GASTOS MENSAIS ESTIMADOS (aluguel + contas + comida…)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 700, color: "#aaa" }}>R$</span>
                  <input value={gastos} onChange={e => setGastos(e.target.value.replace(/\D/g, ""))} placeholder="0" type="number" min="0" style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px 12px 44px", fontSize: 15, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
                  {["800", "1500", "2500", "4000", "6000", "10000"].map(v => (
                    <button key={v} onClick={() => setGastos(v)} style={{ padding: "8px 0", borderRadius: 8, border: `1.5px solid ${gastos === v ? "#ef4444" : "#e8ede8"}`, background: gastos === v ? "#fef2f2" : "#fff", color: gastos === v ? "#b91c1c" : "#666", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif", transition: "all 0.15s" }}>
                      R${parseInt(v).toLocaleString("pt-BR")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly available indicator */}
              {rendaNum > 0 && (
                <div className="calculo-box" style={{ borderRadius: 14, padding: "16px 18px", border: `2px solid ${monthlyAvailable >= 0 ? "#1D9E75" : "#ef4444"}`, background: monthlyAvailable >= 0 ? "#E1F5EE" : "#fef2f2" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: monthlyAvailable >= 0 ? "#085041" : "#b91c1c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    {monthlyAvailable >= 0 ? "✅ Você tem sobra todo mês" : "⚠️ Gastos acima da renda"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: monthlyAvailable >= 0 ? "#085041" : "#b91c1c" }}>
                        R$ {Math.abs(monthlyAvailable).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}<span style={{ fontSize: 13, fontWeight: 700 }}>/mês</span>
                      </div>
                      <div style={{ fontSize: 12, color: monthlyAvailable >= 0 ? "#1D9E75" : "#ef4444", fontWeight: 600, marginTop: 2 }}>
                        {monthlyAvailable >= 0
                          ? `${rendaNum > 0 ? ((monthlyAvailable / rendaNum) * 100).toFixed(0) : 0}% da renda disponível para investir`
                          : "Vamos equilibrar isso juntos no dashboard"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: "#6b9e80" }}>
                      <div>Renda: R$ {rendaNum.toLocaleString("pt-BR")}</div>
                      <div>Gastos: R$ {gastosNum.toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                </div>
              )}
              <p style={{ fontSize: 12, color: "#aaa", margin: 0, textAlign: "center" }}>Pode aproximar — você ajusta isso depois no dashboard.</p>
            </div>
          )}

          {/* ── Step 4: Plano ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "10px 14px", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{sonhoSelecionado.split(" ")[0]}</span>
                <div>
                  <div style={{ fontSize: 12, color: "#6b9e80", fontWeight: 600 }}>Seu sonho</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#085041" }}>{sonhoEhOutro ? sonhoCustom : sonhoSelecionado.split(" ").slice(1).join(" ")}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>QUANTO VALE ESSE SONHO? (R$)</label>
                  <input value={metaValor} onChange={e => setMetaValor(e.target.value)} placeholder="0" type="number" min="0" style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", transition: "border 0.2s" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#666", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>EM QUANTO TEMPO?</label>
                  <select value={metaMeses} onChange={e => setMetaMeses(e.target.value)} style={{ width: "100%", border: "2px solid #e8ede8", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontFamily: "'Nunito',sans-serif", color: "#1a1a1a", boxSizing: "border-box", background: "#fff", transition: "border 0.2s" }}>
                    <option value="3">3 meses</option>
                    <option value="6">6 meses</option>
                    <option value="12">1 ano</option>
                    <option value="24">2 anos</option>
                    <option value="36">3 anos</option>
                    <option value="60">5 anos</option>
                  </select>
                </div>
              </div>

              {calculo && (
                <div className="calculo-box" style={{ background: calculo.viavel ? "#E1F5EE" : "#fff8e1", border: `2px solid ${calculo.viavel ? "#1D9E75" : "#f59e0b"}`, borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: calculo.viavel ? "#085041" : "#92400e", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    {calculo.viavel ? "▶ Seu plano" : "⚠️ Atenção"}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: calculo.viavel ? "#085041" : "#92400e", marginBottom: 4 }}>
                    R$ {calculo.porMes.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}<span style={{ fontSize: 13, fontWeight: 700 }}>/mês</span>
                  </div>
                  <div style={{ fontSize: 13, color: calculo.viavel ? "#1D9E75" : "#b45309", fontWeight: 600, lineHeight: 1.5 }}>
                    {calculo.pctRenda !== null
                      ? calculo.viavel
                        ? `${calculo.pctRenda.toFixed(0)}% da sua renda — a iMoney vai te lembrar toda semana.`
                        : `Isso representa ${calculo.pctRenda.toFixed(0)}% da sua renda. Considere aumentar o prazo ou o valor.`
                      : `Guardando esse valor por mês, você chega lá em ${metaMeses} meses.`
                    }
                  </div>
                </div>
              )}

              <p style={{ fontSize: 12, color: "#aaa", margin: 0, textAlign: "center" }}>Pode aproximar — você ajusta isso depois no dashboard.</p>
            </div>
          )}

          {/* ── Step 5: Radiografia ── */}
          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {PERGUNTAS.map(p => (
                <div key={p.id}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#0d2414", margin: "0 0 10px", lineHeight: 1.4 }}><span style={{ color: "#1D9E75", marginRight: 4 }}>{p.id}.</span>{p.texto}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {p.opcoes.map(opcao => (
                      <button key={opcao} onClick={() => setRespostas(prev => ({ ...prev, [p.id]: opcao }))} style={{ padding: "12px 10px", borderRadius: 12, border: `2px solid ${respostas[p.id] === opcao ? "#1D9E75" : "#e8ede8"}`, background: respostas[p.id] === opcao ? "#E1F5EE" : "#fff", color: respostas[p.id] === opcao ? "#085041" : "#444", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif", textAlign: "left", lineHeight: 1.4, transition: "all 0.15s" }}>
                        {opcao}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {todasRespondidas && <p style={{ fontSize: 13, color: "#1D9E75", textAlign: "center", margin: 0, fontWeight: 700 }}>✅ Perfeito! Clique abaixo para gerar sua radiografia.</p>}
            </div>
          )}

          <button onClick={avancar} disabled={!podeContinuar || loading} style={{ width: "100%", marginTop: 28, padding: "16px 0", borderRadius: 14, border: "none", background: podeContinuar && !loading ? "#1D9E75" : "#e8ede8", color: podeContinuar && !loading ? "#fff" : "#aaa", fontSize: 16, fontWeight: 800, cursor: podeContinuar && !loading ? "pointer" : "not-allowed", fontFamily: "'Nunito',sans-serif", transition: "all 0.2s", boxShadow: podeContinuar && !loading ? "0 4px 20px rgba(29,158,117,0.3)" : "none" }}>
            {loading ? "Gerando sua radiografia... 🩻" : step === 5 ? "Gerar minha Radiografia 🩻" : step === 4 ? "Montar meu plano →" : "Continuar →"}
          </button>
          {step === 4 && <button onClick={() => setStep(5)} style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 12, border: "none", background: "transparent", color: "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>Pular por agora →</button>}
          {step === 5 && <button onClick={pularRadiografia} disabled={loading} style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 12, border: "none", background: "transparent", color: "#aaa", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Nunito',sans-serif" }}>Pular por agora</button>}
        </div>
      </div>
      <p style={{ marginTop: 20, fontSize: 12, color: "#aaa" }}>Seus dados são privados e protegidos 🔒</p>
    </div>
  );
}
