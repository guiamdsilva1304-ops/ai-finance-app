"use client";
import { amplitude, identifyUser } from "../amplitude";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "login" | "register";

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
    if (msg.includes("user not found")) return "Email nao encontrado. Crie uma conta primeiro.";
    if (msg.includes("already registered") || msg.includes("already exists")) return "Este email ja esta cadastrado. Faca login.";
    if (msg.includes("password should be")) return "Senha muito curta. Use minimo 6 caracteres.";
    if (msg.includes("unable to validate email") || msg.includes("invalid email")) return "Email invalido. Verifique o formato.";
    if (msg.includes("signup is disabled")) return "Cadastros temporariamente desabilitados.";
    if (msg.includes("fetch") || msg.includes("network")) return "Erro de conexao. Verifique sua internet.";
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError("Email invalido."); return; }
    if (!password) { setError("Digite uma senha."); return; }
    if (password.length < 6) { setError("Senha deve ter minimo 6 caracteres."); return; }
    if (password !== confirmPassword) { setError("As senhas nao coincidem."); return; }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data, error: err } = await supabase.auth.signUp({
        email: em, password,
        options: { emailRedirectTo: window.location.origin + "/dashboard" },
      });
      if (err) { setError(parseErr(err)); return; }
      if (!data.user) { setError("Nao foi possivel criar a conta. Tente novamente."); return; }
      const { data: ld, error: le } = await supabase.auth.signInWithPassword({ email: em, password });
      if (!le && ld.user) {
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
        setTimeout(() => { window.location.href = "/dashboard"; }, 500);
      } else {
        setSuccess("Conta criada! Verifique seu email para confirmar e depois faca login.");
        setTab("login"); setPassword(""); setConfirmPassword("");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally { setLoading(false); }
  }

  // Track login started
  if (typeof window !== "undefined" && mounted) {
    amplitude.track("Login Started", {
      auth_method: "email",
      entry_page: window.location.pathname,
      is_returning_user: tab === "login",
    });
  }

  if (!mounted) return (
    <div className="min-h-screen bg-[#f8fdf9] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#16a34a] border-t-transparent animate-spin"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fdf9] flex flex-col">
      <header className="flex justify-center pt-10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-white font-black text-xl" style={{fontFamily:"Nunito,sans-serif"}}>i</div>
          <div>
            <div className="font-black text-[#14532d] text-2xl leading-none" style={{fontFamily:"Nunito,sans-serif"}}>iMoney</div>
            <div className="text-[10px] text-[#6b9e80] uppercase tracking-widest">assessorIA financeira</div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[#e4f5e9] overflow-hidden" style={{boxShadow:"0 8px 40px rgba(20,83,45,0.12)"}}>
            <div className="flex border-b border-[#e4f5e9]">
              {(["login","register"] as Tab[]).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                  className={cn("flex-1 py-4 text-sm font-bold transition-all",
                    tab === t ? "text-[#15803d] border-b-2 border-[#16a34a] bg-[#f0fdf4]" : "text-[#8db89d] hover:text-[#15803d]"
                  )} style={{fontFamily:"Nunito,sans-serif"}}>
                  {t === "login" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>
            <div className="p-8">
              {error && (
                <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5"/><span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-5 flex items-start gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3 text-sm text-[#15803d]">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5"/><span>{success}</span>
                </div>
              )}
              {tab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="label">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]"/>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com" autoComplete="email" className="input pl-10" disabled={loading}/>
                    </div>
                  </div>
                  <div>
                    <label className="label">Senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]"/>
                      <input type={showPass ? "text" : "password"} value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="Sua senha"
                        autoComplete="current-password" className="input pl-10 pr-10" disabled={loading}/>
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8db89d] hover:text-[#15803d]">
                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Entrando...</span>
                      : <span className="flex items-center gap-2">Entrar <ArrowRight size={16}/></span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <label className="label">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]"/>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com" autoComplete="email" className="input pl-10" disabled={loading}/>
                    </div>
                  </div>
                  <div>
                    <label className="label">Senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]"/>
                      <input type={showPass ? "text" : "password"} value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caracteres"
                        className="input pl-10 pr-10" disabled={loading}/>
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8db89d] hover:text-[#15803d]">
                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex gap-1 flex-1">
                          {[1,2,3].map(i => (
                            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all",
                              i <= passStrength ? ["bg-red-400","bg-amber-400","bg-[#4ade80]"][passStrength-1] : "bg-gray-200")}/>
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-[#6b9e80]">
                          {["Fraca","Media","Forte"][passStrength-1] ?? ""}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label">Confirme a senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]"/>
                      <input type={showPass ? "text" : "password"} value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha"
                        className={cn("input pl-10", confirmPassword && confirmPassword !== password && "border-red-300")}
                        disabled={loading}/>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-500 mt-1">Senhas nao coincidem</p>
                    )}
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f0faf4] border border-[#c8e6c9]">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#00C853] cursor-pointer flex-shrink-0"
                    />
                    <label htmlFor="consent" className="text-xs text-[#1a3a1a] leading-relaxed cursor-pointer">
                      Li e concordo com os{" "}
                      <a href="/termos" target="_blank" className="text-[#00C853] font-bold underline">Termos de Uso</a>
                      {" "}e a{" "}
                      <a href="/privacidade" target="_blank" className="text-[#00C853] font-bold underline">Política de Privacidade</a>
                      {" "}da iMoney, incluindo o uso dos meus dados para personalização do serviço e envio de emails de onboarding.
                    </label>
                  </div>
                  <button type="submit" disabled={loading || !consent} className="btn-primary w-full" style={{opacity: !consent ? 0.5 : 1}}>
                    {loading ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Criando conta...</span>
                      : <span className="flex items-center gap-2">Criar conta <ArrowRight size={16}/></span>}
                  </button>
                </form>
              )}
              <p className="text-center text-xs text-[#8db89d] mt-6">Esqueceu a senha? Entre em contato com o suporte.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
