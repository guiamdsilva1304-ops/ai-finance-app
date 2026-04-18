"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "login" | "register";

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supabase = createSupabaseBrowser();

  const passStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (/[a-zA-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    return score;
  })();
  const strengthColor = ["bg-red-400", "bg-amber-400", "bg-[#4ade80]"][passStrength - 1] ?? "bg-gray-200";
  const strengthLabel = ["Fraca", "Média", "Forte"][passStrength - 1] ?? "";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim() || !password) { setError("Preencha todos os campos."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes("invalid") || msg.includes("credentials")) setError("Email ou senha incorretos.");
        else if (msg.includes("confirmed")) setError("Confirme seu email antes de entrar.");
        else setError("Erro ao entrar. Tente novamente.");
      } else {
        window.location.href = "/dashboard";
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim() || !password) { setError("Preencha todos os campos."); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    if (password.length < 6) { setError("Senha deve ter mínimo 6 caracteres."); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes("already")) setError("Email já cadastrado. Faça login.");
        else setError("Erro ao criar conta. Tente novamente.");
      } else if (data.user) {
        // Try auto login
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password,
        });
        if (!loginErr) {
          window.location.href = "/dashboard";
        } else {
          setSuccess("Conta criada! Verifique seu email para confirmar.");
          setTab("login");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fdf9] bg-dots flex flex-col">
      {/* Header */}
      <header className="flex justify-center pt-10 pb-6">
        <Logo size={52} showText showTagline />
      </header>

      {/* Card */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-md animate-fade-up">
          <div className="card p-0 overflow-hidden shadow-[0_8px_40px_rgba(20,83,45,0.12)]">

            {/* Tab bar */}
            <div className="flex border-b border-[#e4f5e9]">
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                  className={cn(
                    "flex-1 py-4 text-sm font-bold transition-all duration-200",
                    "font-[Nunito,sans-serif]",
                    tab === t
                      ? "text-[#15803d] border-b-2 border-[#16a34a] bg-[#f0fdf4]"
                      : "text-[#8db89d] hover:text-[#15803d] hover:bg-[#f8fdf9]"
                  )}
                  style={{ fontFamily: "Nunito, sans-serif" }}
                >
                  {t === "login" ? "🔑 Entrar" : "✨ Criar conta"}
                </button>
              ))}
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <span className="text-red-500">⚠</span> {error}
                </div>
              )}
              {success && (
                <div className="mb-5 flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3 text-sm text-[#15803d]">
                  <CheckCircle2 size={16} /> {success}
                </div>
              )}

              {tab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="label">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]" />
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com" autoComplete="email"
                        className="input pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]" />
                      <input
                        type={showPass ? "text" : "password"} value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Sua senha" autoComplete="current-password"
                        className="input pl-10 pr-10"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8db89d] hover:text-[#15803d]">
                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-primary w-full mt-2">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                        Entrando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">Entrar <ArrowRight size={16}/></span>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <label className="label">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]" />
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com" autoComplete="email"
                        className="input pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]" />
                      <input
                        type={showPass ? "text" : "password"} value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="input pl-10 pr-10"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8db89d] hover:text-[#15803d]">
                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                    {/* Strength meter */}
                    {password && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex gap-1 flex-1">
                          {[1,2,3].map(i => (
                            <div key={i}
                              className={cn("h-1.5 flex-1 rounded-full transition-all",
                                i <= passStrength ? strengthColor : "bg-gray-200")} />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-[#6b9e80]">{strengthLabel}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label">Confirme a senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8db89d]" />
                      <input
                        type={showPass ? "text" : "password"} value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                        className={cn("input pl-10", confirmPassword && confirmPassword !== password && "input-error")}
                      />
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-500 mt-1">Senhas não coincidem</p>
                    )}
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-primary w-full mt-2">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                        Criando conta...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">Criar conta <ArrowRight size={16}/></span>
                    )}
                  </button>
                </form>
              )}

              <p className="text-center text-xs text-[#8db89d] mt-6">
                Esqueceu a senha? Entre em contato com o suporte.
              </p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-6">
            {[
              { icon: "🔒", text: "Dados criptografados" },
              { icon: "🏦", text: "Open Finance BCB" },
              { icon: "🤖", text: "IA com Claude" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-[11px] text-[#6b9e80]">
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
