"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { CheckCircle2, Landmark, Bell, Shield, Zap, ArrowRight } from "lucide-react";

export default function OpenFinancePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
    }
    check();
  }, [supabase]);

  async function register() {
    setError("");
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("openfinance_interest").insert({
      user_id: user?.id ?? null,
      email: email.trim(),
    });
    setLoading(false);
    if (err && err.code !== "23505") { setError("Erro ao registrar. Tente novamente."); return; }
    setDone(true);
  }

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>🏦 Open Finance</h1>
        <p className="text-sm text-[#6b9e80] mt-0.5">Conecte seus bancos automaticamente</p>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-[#0d2414] to-[#16a34a] p-8 text-white mb-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full"/>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"/>
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Bell size={11}/> Em breve
          </div>
          <h2 className="text-2xl font-black mb-3" style={{ fontFamily: "Nunito, sans-serif" }}>Seus extratos bancários direto no iMoney</h2>
          <p className="text-green-200 text-sm leading-relaxed">Estamos desenvolvendo a integração com Open Finance para você conectar seus bancos e ter todas as transações importadas automaticamente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: <Landmark size={20}/>, title: "Todos os bancos", desc: "Nubank, Itaú, BB, Bradesco, Santander e mais de 200 instituições" },
          { icon: <Zap size={20}/>, title: "Sync automático", desc: "Transações importadas em tempo real, sem trabalho manual" },
          { icon: <Shield size={20}/>, title: "100% seguro", desc: "Regulamentado pelo Banco Central. Dados protegidos pela LGPD" },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="card text-center p-5">
            <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center mx-auto mb-3">{icon}</div>
            <p className="font-black text-[#0d2414] text-sm mb-1">{title}</p>
            <p className="text-xs text-[#6b9e80] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="card border-[#bbf7d0] bg-[#f8fdf9]">
        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-[#f0fdf4] border-2 border-[#16a34a] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-[#16a34a]"/>
            </div>
            <p className="font-black text-[#0d2414] text-lg mb-2">Você entrou na lista! 🎉</p>
            <p className="text-sm text-[#6b9e80] max-w-sm mx-auto">Te avisaremos assim que o Open Finance estiver disponível no iMoney. Fique de olho no seu e-mail!</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center shrink-0"><Bell size={18}/></div>
              <div>
                <p className="font-black text-[#0d2414]">Entre na lista de espera</p>
                <p className="text-sm text-[#6b9e80] mt-0.5">Seja um dos primeiros a usar quando lançarmos. Sem spam! 🤝</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input flex-1"
              />
              <button onClick={register} disabled={loading} className="btn-primary shrink-0 flex items-center gap-2">
                {loading
                  ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                  : <><span>Quero!</span><ArrowRight size={15}/></>
                }
              </button>
            </div>
            {error && <p className="text-xs text-red-500 mt-2">⚠ {error}</p>}
            <p className="text-[11px] text-[#8db89d] mt-3 text-center">Gratuito para sempre para os primeiros usuários</p>
          </>
        )}
      </div>
    </div>
  );
}
