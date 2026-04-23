"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowRight, BarChart3, Brain, Shield, TrendingUp, Zap, ChevronDown } from "lucide-react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Nunito, sans-serif" }}>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 h-28 flex items-center justify-between">
          <Image src="/logo.png" alt="iMoney" width={200} height={200} className="object-contain" style={{objectFit:"contain"}}/>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-bold text-[#5a6472] hover:text-[#16a34a] transition-colors">Entrar</Link>
            <Link href="/login" className="bg-[#16a34a] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#15803d] transition-colors">Criar conta grátis</Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f0fdf4] via-white to-[#f0fdf4]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#16a34a]/10 rounded-full blur-3xl"/>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#22c55e]/10 rounded-full blur-3xl"/>
        </div>
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] text-xs font-bold px-4 py-2 rounded-full mb-6">
            <Zap size={12}/> Powered by Inteligência Artificial
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0d2414] leading-tight mb-6">
            Seu dinheiro,{" "}
            <span className="text-[#16a34a]">finalmente</span>{" "}
            fazendo sentido
          </h1>
          <p className="text-lg sm:text-xl text-[#5a6472] max-w-2xl mx-auto mb-10 leading-relaxed">
            O iMoney é seu assessor financeiro com IA que entende sua realidade brasileira. Sem enrolação, sem taxa, sem complicação. 💚
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-lg px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-lg shadow-green-500/25">
              Começar agora — é grátis <ArrowRight size={20}/>
            </Link>
            <a href="#como-funciona" className="inline-flex items-center justify-center gap-2 bg-white border-2 border-[#e4f5e9] hover:border-[#16a34a] text-[#0d2414] font-bold text-lg px-8 py-4 rounded-2xl transition-all">
              Como funciona <ChevronDown size={20}/>
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { value: "100%", label: "Gratuito" },
              { value: "IA", label: "Assessor inteligente" },
              { value: "BCB", label: "Dados oficiais em tempo real" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-black text-[#16a34a]">{value}</p>
                <p className="text-sm text-[#8db89d] font-bold">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown size={24} className="text-[#8db89d]"/>
        </div>
      </section>

      <section id="como-funciona" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#16a34a] font-bold text-sm uppercase tracking-wider">Simples assim</span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0d2414] mt-2">Em 3 passos você já tá no controle</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", emoji: "📝", title: "Registre seus gastos", desc: "Anote suas receitas e despesas em segundos. A IA categoriza automaticamente pra você." },
              { step: "02", emoji: "📊", title: "Veja o panorama real", desc: "Dashboard completo com SELIC, IPCA e tudo que impacta seu bolso, em tempo real." },
              { step: "03", emoji: "🤖", title: "Converse com sua IA", desc: "Pergunte qualquer coisa sobre finanças. Sua assessora particular responde com base no seu perfil." },
            ].map(({ step, emoji, title, desc }) => (
              <div key={step} className="relative text-center p-8 rounded-3xl border border-[#e4f5e9] hover:border-[#16a34a] hover:shadow-lg transition-all">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#16a34a] text-white text-xs font-black px-3 py-1 rounded-full">Passo {step}</div>
                <div className="text-5xl mb-4 mt-2">{emoji}</div>
                <h3 className="text-lg font-black text-[#0d2414] mb-2">{title}</h3>
                <p className="text-[#6b9e80] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#f0fdf4]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#16a34a] font-bold text-sm uppercase tracking-wider">Funcionalidades</span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0d2414] mt-2">Tudo que você precisa, num só lugar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Brain size={24}/>, title: "Assessor IA 24/7", desc: "Tire dúvidas sobre investimentos, metas e estratégias a qualquer hora. Respostas personalizadas pro seu perfil.", color: "bg-purple-50 text-purple-600" },
              { icon: <TrendingUp size={24}/>, title: "SELIC e IPCA em tempo real", desc: "Dados oficiais do Banco Central atualizados automaticamente. Saiba exatamente quanto seu dinheiro rende.", color: "bg-green-50 text-green-600" },
              { icon: <BarChart3 size={24}/>, title: "Dashboard financeiro", desc: "Visualize renda, gastos, sobra e projeções de poupança num painel limpo e intuitivo.", color: "bg-blue-50 text-blue-600" },
              { icon: <Shield size={24}/>, title: "Reserva de emergência", desc: "Calcule quanto você precisa guardar e onde aplicar pra ter segurança financeira de verdade.", color: "bg-orange-50 text-orange-600" },
              { icon: <Zap size={24}/>, title: "Metas financeiras", desc: "Defina objetivos e acompanhe o progresso. A IA te diz a melhor estratégia pra chegar lá.", color: "bg-yellow-50 text-yellow-600" },
              { icon: <ArrowRight size={24}/>, title: "Open Finance", desc: "Conecte suas contas bancárias com segurança e tenha uma visão completa das suas finanças.", color: "bg-pink-50 text-pink-600" },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-[#e4f5e9] hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>{icon}</div>
                <h3 className="font-black text-[#0d2414] mb-2">{title}</h3>
                <p className="text-sm text-[#6b9e80] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-[#0d2414] mb-12">O iMoney é pra você que... 👇</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {[
              "💸 Ganha no fim do mês e não sabe onde o dinheiro foi",
              "📈 Quer começar a investir mas não sabe por onde",
              "🎯 Tem uma meta (viagem, carro, casa) e não sabe como chegar lá",
              "😰 Tá endividado e quer um plano pra sair dessa",
              "🤔 Quer entender a diferença entre CDB, Tesouro e FII",
              "📱 Prefere um app simples a planilhas complicadas",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 bg-[#f8fdf9] border border-[#e4f5e9] rounded-xl p-4">
                <span className="text-lg">{item.split(" ")[0]}</span>
                <p className="text-sm font-bold text-[#0d2414] leading-relaxed">{item.slice(item.indexOf(" ") + 1)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-[#0d2414] to-[#16a34a] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🚀</div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Pronto pra tomar controle do seu dinheiro?</h2>
          <p className="text-green-200 text-lg mb-10 max-w-2xl mx-auto">Crie sua conta grátis em menos de 1 minuto e comece hoje mesmo. Sem cartão de crédito, sem pegadinha.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-[#16a34a] font-black text-lg px-10 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl">
            Criar minha conta grátis <ArrowRight size={20}/>
          </Link>
          <p className="text-green-300 text-sm mt-4">100% gratuito · Sem anúncios · Dados protegidos</p>
        </div>
      </section>

      <footer className="bg-[#0d2414] border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-black text-[#16a34a]">i<span className="text-white">Money</span></span>
          <p className="text-sm text-green-800">© 2026 iMoney · Feito com 💚 no Brasil</p>
          <p className="text-xs text-green-900">Dados do Banco Central do Brasil</p>
        </div>
      </footer>
    </div>
  );
}
