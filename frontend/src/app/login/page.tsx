"use client";
import { amplitude, identifyUser } from "../amplitude";
import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "login" | "register";

const SONHOS = [
  { emoji: "🏠", label: "Casa própria", cor: "#E8F5E9" },
  { emoji: "✈️", label: "Viagem dos sonhos", cor: "#E3F2FD" },
  { emoji: "🚗", label: "Meu primeiro carro", cor: "#FFF8E1" },
  { emoji: "🛡️", label: "Reserva de emergência", cor: "#F3E5F5" },
  { emoji: "📈", label: "Independência financeira", cor: "#E0F2F1" },
  { emoji: "🎓", label: "Educação / pós-grad", cor: "#FCE4EC" },
];

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);
  const [sonhoHover, setSonhoHover] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) window.location.href = "/dashboard";
    });
  }, []);

  const passStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (/[a-zA-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    return s;
  })();

  function parseErr(err: { message: string; status?: number }): string {
    const msg = (err.message ?? "").toLowerCase();
    const st = err.status ?? 0;
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) return "Email ou senha incorretos.";
    if (msg.includes("email not confirmed")) return "Confirme seu email antes de entrar. Verifique sua caixa de entrada.";
    if (msg.includes("too many") || st === 429) return "Muitas tentativas. Aguarde alguns minutos.";
    if (msg.includes("user not found")) return "Email não encontrado. Crie uma conta primeiro.";
    if (msg.includes("already registered") || msg.includes("already exists")) return "Este email já está cadastrado. Faça login.";
    if (msg.includes("password should be")) return "Senha muito curta. Use mínimo 8 caracteres.";
    if (msg.includes("unable to validate email") || msg.includes("invalid email")) return "Email inválido. Verifique o formato.";
    if (msg.includes("signup is disabled")) return "Cadastros temporariamente desabilitados.";
    if (msg.includes("fetch") || msg.includes("network")) return "Erro de conexão. Verifique sua internet.";
    return "Erro: " + err.message;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const em = email.trim().toLowerCase();
    if (!em) { setError("Digite seu email."); return; }
    if (!password) { setError("Digite sua senha."); return; }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: em, password });
      if (err) { setError(parseErr(err)); return; }
      if (data.user) {
        supabase.from("user_profiles").update({ last_login_at: new Date().toISOString(), followup_sent: false }).eq("id", data.user.id).then(() => {});
        amplitude.track("Login Completed", {
          auth_method: "email",
          mfa_used: false,
          session_id: data.session?.access_token?.slice(-8) || "",
        });
        identifyUser(data.user.id, {
          "Plan Type": "free",
          "Trial Status": false,
          "Signup Method": "email",
          "AI Feature Access": true,
          "Primary Currency": "BRL",
        });
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
          window.location.href = "/verificacao-2fa";
          return;
        }
        setSuccess("Login realizado! Redirecionando...");
        setTimeout(() => { window.location.href = "/dashboard"; }, 500);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const em = email.trim().toLowerCase();
    if (!em) { setError("Digite seu email."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError("Email inválido."); return; }
    if (!password) { setError("Digite uma senha."); return; }
    if (password.length < 8) { setError("Senha deve ter mínimo 8 caracteres."); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data, error: err } = await supabase.auth.signUp({
        email: em, password,
        options: { emailRedirectTo: window.location.origin + "/onboarding" },
      });
      if (err) { setError(parseErr(err)); return; }
      if (!data.user) { setError("Não foi possível criar a conta. Tente novamente."); return; }
      const { data: ld, error: le } = await supabase.auth.signInWithPassword({ email: em, password });
      if (!le && ld.user) {
        fetch("/api/emails/welcome", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: ld.user.id, email: em }) }).catch(() => {});
        amplitude.track("Login Completed", {
          auth_method: "email",
          mfa_used: false,
          session_id: ld.session?.access_token?.slice(-8) || "",
        });
        identifyUser(ld.user.id, {
          "Plan Type": "free",
          "Trial Status": false,
          "Signup Method": "email",
          "Onboarding Status": "started",
          "AI Feature Access": true,
          "Primary Currency": "BRL",
          "Account Connection Status": false,
          "Connected Institution Count": 0,
          "Notification Opt-In": true,
        });
        setSuccess("Conta criada! Redirecionando...");
        setTimeout(() => { window.location.href = "/onboarding"; }, 500);
      } else {
        setSuccess("Conta criada! Verifique seu email para confirmar e depois faça login.");
        setTab("login"); setPassword(""); setConfirmPassword("");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally { setLoading(false); }
  }

  if (typeof window !== "undefined" && mounted) {
    amplitude.track("Login Started", {
      auth_method: "email",
      entry_page: window.location.pathname,
      is_returning_user: tab === "login",
    });
  }

  if (!mounted) return (
    <div className="min-h-screen bg-[#f8fdf9] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#16a34a] border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatA { 0%,100% { transform: translateY(0px) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(-2deg); } }
        @keyframes floatB { 0%,100% { transform: translateY(0px) rotate(3deg); } 50% { transform: translateY(-12px) rotate(3deg); } }
        .animate-fade-up { animation: fadeUp 0.5s ease forwards; }
        .delay-1 { animation-delay: 0.1s; opacity: 0; }
        .delay-2 { animation-delay: 0.2s; opacity: 0; }
        .delay-3 { animation-delay: 0.3s; opacity: 0; }
        .float-a { animation: floatA 4s ease-in-out infinite; }
        .float-b { animation: floatB 5s ease-in-out infinite; }
        .sonho-card { transition: all 0.2s ease; }
        .sonho-card:hover { transform: translateY(-3px) scale(1.03); }
        input:focus, select:focus { outline: none; border-color: #1D9E75 !important; box-shadow: 0 0 0 3px rgba(29,158,117,0.12); }
      `}</style>

     <div style={{ flex: "1", background: "linear-gradient(155deg, #064e2e 0%, #0d7a4e 50%, #1D9E75 100%)", flexDirection: "column", justifyContent: "center", padding: "60px 56px", position: "relative", overflow: "hidden" }} className="hidden lg:flex">
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "360px", height: "360px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-120px", left: "-60px", width: "480px", height: "480px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
        <div className="animate-fade-up" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 56 }}>
          <img src="/icon.svg" alt="iMoney" width={44} height={44} style={{ borderRadius: 12 }} />
          <div>
            <div style={{ fontWeight: 900, color: "#fff", fontSize: 22, lineHeight: 1 }}>iMoney</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.16em" }}>assessorIA financeira</div>
          </div>
        </div>
        <div className="animate-fade-up delay-1">
          <h2 style={{ fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1.15, margin: "0 0 20px" }}>
            Seus sonhos têm<br /><span style={{ color: "#A7F3D0" }}>um plano.</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: "0 0 48px", maxWidth: 360 }}>
            A iMoney transforma seus objetivos de vida em metas concretas — com IA que conhece sua situação e te guia passo a passo.
          </p>
        </div>
        <div className="animate-fade-up delay-2" style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>O que as pessoas realizam com a iMoney</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 380 }}>
            {SONHOS.slice(0, 4).map((s, i) => (
              <div key={s.label} onMouseEnter={() => setSonhoHover(s.label)} onMouseLeave={() => setSonhoHover(null)} className="sonho-card" style={{ background: sonhoHover === s.label ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: 10, cursor: "default" }}>
                <span style={{ fontSize: 22 }}>{s.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="animate-fade-up delay-3" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex" }}>
            {["💚", "💛", "💙", "🩷"].map((c, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginLeft: i > 0 ? -8 : 0 }}>{c}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>+1.200 pessoas</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>construindo seus sonhos agora</div>
          </div>
        </div>
        <div className="float-a" style={{ position: "absolute", top: "22%", right: 32, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", borderRadius: 16, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.2)", maxWidth: 190 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>🏠 Meta: Apartamento</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>68%</div>
          <div style={{ fontSize: 11, color: "#A7F3D0" }}>↑ R$ 1.200 esse mês</div>
        </div>
        <div className="float-b" style={{ position: "absolute", bottom: "28%", right: 24, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderRadius: 16, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.15)", maxWidth: 170 }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>✨</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.4 }}>"Você está no caminho certo!"</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Assessor IA</div>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 520, background: "#f8fdf9", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 40px", overflowY: "auto" }}>
        <div className="flex lg:hidden justify-center mb-8">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/icon.svg" alt="iMoney" width={40} height={40} style={{ borderRadius: 10 }} />
            <div style={{ fontWeight: 900, color: "#14532d", fontSize: 20, fontFamily: "'Nunito', sans-serif" }}>iMoney</div>
          </div>
        </div>
        <div className="animate-fade-up">
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0d2414", marginBottom: 6, fontFamily: "'Nunito', sans-serif" }}>
            {tab === "login" ? "Bem-vindo de volta 👋" : "Comece sua jornada 🚀"}
          </h1>
          <p style={{ fontSize: 14, color: "#6b9e80", marginBottom: 32 }}>
            {tab === "login" ? "Entre na sua conta para continuar." : "Crie sua conta gratuita agora."}
          </p>
        </div>
        <div className="animate-fade-up delay-1" style={{ display: "flex", background: "#fff", borderRadius: 14, padding: 4, border: "1px solid #e4f5e9", marginBottom: 28 }}>
          {(["login", "register"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: tab === t ? "#1D9E75" : "transparent", color: tab === t ? "#fff" : "#8db89d", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif", transition: "all 0.2s", boxShadow: tab === t ? "0 2px 8px rgba(29,158,117,0.25)" : "none" }}>
              {t === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>
        <div className="animate-fade-up delay-2">
          {error && (
            <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#dc2626" }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#15803d" }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{success}</span>
            </div>
          )}
          {tab === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4a7a5c", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
                <div style={{ position: "relative" }}>
                  <Mail size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#8db89d" }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" style={{ width: "100%", background: "#fff", border: "2px solid #e4f5e9", borderRadius: 12, padding: "12px 16px 12px 42px", fontSize: 14, fontFamily: "'Nunito', sans-serif", color: "#0d2414", transition: "border 0.2s" }} disabled={loading} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4a7a5c", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Senha</label>
                <div style={{ position: "relative" }}>
                  <Lock size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#8db89d" }} />
                  <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" autoComplete="current-password" style={{ width: "100%", background: "#fff", border: "2px solid #e4f5e9", borderRadius: 12, padding: "12px 44px 12px 42px", fontSize: 14, fontFamily: "'Nunito', sans-serif", color: "#0d2414", transition: "border 0.2s" }} disabled={loading} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8db89d", padding: 0 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "14px 0", fontSize: 15, borderRadius: 14, marginTop: 4 }}>
                {loading ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "inline-block" }} />Entrando...</span> : <span style={{ display: "flex", alignItems: "center", gap: 8 }}>Entrar <ArrowRight size={16} /></span>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4a7a5c", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
                <div style={{ position: "relative" }}>
                  <Mail size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#8db89d" }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" style={{ width: "100%", background: "#fff", border: "2px solid #e4f5e9", borderRadius: 12, padding: "12px 16px 12px 42px", fontSize: 14, fontFamily: "'Nunito', sans-serif", color: "#0d2414", transition: "border 0.2s" }} disabled={loading} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4a7a5c", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Senha</label>
                <div style={{ position: "relative" }}>
                  <Lock size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#8db89d" }} />
                  <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" style={{ width: "100%", background: "#fff", border: "2px solid #e4f5e9", borderRadius: 12, padding: "12px 44px 12px 42px", fontSize: 14, fontFamily: "'Nunito', sans-serif", color: "#0d2414", transition: "border 0.2s" }} disabled={loading} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8db89d", padding: 0 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", gap: 4, flex: 1 }}>
                      {[1, 2, 3].map(i => (<div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= passStrength ? (passStrength === 1 ? "#f87171" : passStrength === 2 ? "#fbbf24" : "#4ade80") : "#e4f5e9", transition: "background 0.2s" }} />))}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#6b9e80" }}>{["Fraca", "Média", "Forte"][passStrength - 1] ?? ""}</span>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4a7a5c", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Confirmar senha</label>
                <div style={{ position: "relative" }}>
                  <Lock size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#8db89d" }} />
                  <input type={showPass ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" style={{ width: "100%", background: "#fff", border: `2px solid ${confirmPassword && confirmPassword !== password ? "#fca5a5" : "#e4f5e9"}`, borderRadius: 12, padding: "12px 16px 12px 42px", fontSize: 14, fontFamily: "'Nunito', sans-serif", color: "#0d2414", transition: "border 0.2s" }} disabled={loading} />
                </div>
                {confirmPassword && confirmPassword !== password && (<p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>Senhas não coincidem</p>)}
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e4f5e9", display: "flex", gap: 12 }}>
                <input type="checkbox" id="consent" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: "#00C853", cursor: "pointer", flexShrink: 0 }} />
                <label htmlFor="consent" style={{ fontSize: 12, color: "#1a3a1a", lineHeight: 1.6, cursor: "pointer" }}>
                  Li e concordo com os <a href="/termos" target="_blank" style={{ color: "#00C853", fontWeight: 700 }}>Termos de Uso</a> e a <a href="/privacidade" target="_blank" style={{ color: "#00C853", fontWeight: 700 }}>Política de Privacidade</a> da iMoney.
                </label>
              </div>
              <button type="submit" disabled={loading || !consent} className="btn-primary" style={{ width: "100%", padding: "14px 0", fontSize: 15, borderRadius: 14, opacity: !consent ? 0.5 : 1 }}>
                {loading ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "inline-block" }} />Criando conta...</span> : <span style={{ display: "flex", alignItems: "center", gap: 8 }}>Criar conta grátis <ArrowRight size={16} /></span>}
              </button>
            </form>
          )}
          <p style={{ textAlign: "center", fontSize: 12, color: "#8db89d", marginTop: 24 }}>
            Esqueceu a senha? <a href="/esqueci-senha" style={{ color: "#00C853", fontWeight: 700 }}>Redefinir senha</a>
          </p>
        </div>
      </div>
    </div>
  );
}
