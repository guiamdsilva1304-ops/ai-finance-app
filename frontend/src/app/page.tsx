"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ArrowRight, ChevronDown, Star, TrendingUp, Shield, Brain, BarChart3, Zap, Check } from "lucide-react";

const DEPOIMENTOS = [
  { nome: "Ana Carolina", cargo: "Analista, 26 anos", texto: "Finalmente entendo pra onde vai meu salário. O Assessor IA me ajudou a montar minha reserva de emergência em 4 meses.", avatar: "AC" },
  { nome: "Rodrigo Mendes", cargo: "Freela, 29 anos", texto: "Como autônomo, minha renda varia muito. O iMoney me ajuda a planejar os meses difíceis sem entrar no cheque especial.", avatar: "RM" },
  { nome: "Juliana Costa", cargo: "CLT, 24 anos", texto: "Comecei a investir pela primeira vez na vida. O Assessor me explicou tudo sem enrolação e sem me fazer sentir burra.", avatar: "JC" },
];

const FEATURES = [
  { icon: Brain, title: "Assessor IA 24/7", desc: "Pergunte qualquer coisa sobre finanças e receba respostas baseadas nos seus dados reais — não conselhos genéricos.", cor: "#7F77DD" },
  { icon: BarChart3, title: "Dashboard completo", desc: "Veja renda, gastos, metas e investimentos num painel limpo. Saiba exatamente onde está seu dinheiro.", cor: "#1D9E75" },
  { icon: TrendingUp, title: "SELIC e IPCA em tempo real", desc: "Dados oficiais do Banco Central atualizados automaticamente. Saiba quanto seu dinheiro rende de verdade.", cor: "#378ADD" },
  { icon: Shield, title: "Reserva de emergência", desc: "Calcule quanto guardar e onde aplicar. A IA te diz o caminho mais curto para ter segurança financeira.", cor: "#EF9F27" },
  { icon: Zap, title: "Metas financeiras", desc: "Defina objetivos e acompanhe o progresso semana a semana. A IA ajusta a estratégia quando você desvia.", cor: "#D85A30" },
  { icon: TrendingUp, title: "Controle de investimentos", desc: "Registre seus ativos e acompanhe a rentabilidade. Veja se sua carteira está alinhada com seus objetivos.", cor: "#085041" },
];

const PLANOS = [
  { nome: "Gratuito", preco: "R$ 0", periodo: "para sempre", cor: "#888", features: ["Dashboard financeiro", "Controle de transações", "Metas (até 3)", "SELIC e IPCA em tempo real"], cta: "Começar grátis", href: "/login", destaque: false },
  { nome: "Pro", preco: "R$ 29,90", periodo: "/mês", cor: "#1D9E75", features: ["Tudo do gratuito", "Assessor IA ilimitado", "Metas ilimitadas", "Controle de investimentos", "Relatórios mensais", "Suporte prioritário"], cta: "Assinar Pro", href: "/login", destaque: true },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [contador, setContador] = useState({ usuarios: 847, conversas: 12340 });

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setContador(prev => ({
        usuarios: prev.usuarios + Math.floor(Math.random() * 2),
        conversas: prev.conversas + Math.floor(Math.random() * 5),
      }));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: "100vh", background: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(29,158,117,0.4)} 70%{box-shadow:0 0 0 10px rgba(29,158,117,0)} }
        @keyframes count-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .hero-btn { animation: pulse-green 2s infinite; }
        .float { animation: float 3s ease-in-out infinite; }
        @media(max-width:768px) { .hide-mobile { display: none !important; } .hero-title { font-size: 32px !important; } .section-pad { padding: 60px 20px !important; } }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        boxShadow: scrolled ? "0 1px 20px rgba(0,0,0,0.08)" : "none",
        transition: "all 0.3s",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Image src="/logo.png" alt="iMoney" width={140} height={40} style={{ objectFit: "contain" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/blog" style={{ fontSize: 14, fontWeight: 700, color: "#5a6472", textDecoration: "none" }}>Blog</Link>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: "#5a6472", textDecoration: "none" }}>Entrar</Link>
            <Link href="/login" style={{ background: "#1D9E75", color: "#fff", fontSize: 14, fontWeight: 800, padding: "10px 20px", borderRadius: 12, textDecoration: "none" }}>
              Criar conta grátis →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f0fdf4 0%, #fff 50%, #f0fdf4 100%)", position: "relative", overflow: "hidden", paddingTop: 72 }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: "rgba(29,158,117,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(29,158,117,0.06)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px", textAlign: "center", position: "relative" }}>
          {/* Social proof topo */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e4f5e9", borderRadius: 100, padding: "8px 16px", marginBottom: 28, boxShadow: "0 2px 12px rgba(29,158,117,0.1)" }}>
            <div style={{ display: "flex", gap: -4 }}>
              {["AC", "RM", "JC"].map((i, idx) => (
                <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: ["#1D9E75", "#378ADD", "#7F77DD"][idx], border: "2px solid #fff", marginLeft: idx > 0 ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: "#fff" }}>{i}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#EF9F27" color="#EF9F27" />)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#085041" }}>{contador.usuarios.toLocaleString('pt-BR')} pessoas já usam a iMoney</span>
          </div>

          <h1 className="hero-title" style={{ fontSize: 52, fontWeight: 900, color: "#0d2414", lineHeight: 1.1, marginBottom: 20 }}>
            Seu dinheiro finalmente{" "}
            <span style={{ color: "#1D9E75", position: "relative" }}>
              fazendo sentido
            </span>
          </h1>

          <p style={{ fontSize: 20, color: "#5a6472", lineHeight: 1.7, marginBottom: 36, maxWidth: 580, margin: "0 auto 36px" }}>
            O assessor financeiro com IA que entende sua realidade — não só gráficos bonitos. Pergunte qualquer coisa sobre suas finanças e receba respostas baseadas nos seus dados reais.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
            <Link href="/login" className="hero-btn" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#1D9E75", color: "#fff", fontWeight: 900, fontSize: 18,
              padding: "16px 32px", borderRadius: 16, textDecoration: "none",
              boxShadow: "0 8px 32px rgba(29,158,117,0.35)",
            }}>
              Começar agora — é grátis <ArrowRight size={20} />
            </Link>
            <a href="#como-funciona" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "2px solid #e4f5e9", color: "#0d2414", fontWeight: 700, fontSize: 16, padding: "16px 28px", borderRadius: 16, textDecoration: "none" }}>
              Ver como funciona <ChevronDown size={18} />
            </a>
          </div>

          <p style={{ fontSize: 13, color: "#8db89d", fontWeight: 600 }}>
            ✓ 100% gratuito para começar &nbsp;·&nbsp; ✓ Sem cartão de crédito &nbsp;·&nbsp; ✓ Sem anúncios
          </p>

          {/* Chat demo */}
          <div className="float" style={{ maxWidth: 520, margin: "48px auto 0", background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", overflow: "hidden", textAlign: "left" }}>
            <div style={{ background: "linear-gradient(135deg, #0a3d28, #1D9E75)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Assessor iMoney</div>
                <div style={{ fontSize: 11, color: "#9FE1CB" }}>● online agora</div>
              </div>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#f0fdf4", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", maxWidth: "85%" }}>
                <p style={{ fontSize: 13, color: "#0d2414", lineHeight: 1.5 }}>Analisando seus dados... você gastou <strong>R$ 847</strong> em alimentação este mês — <strong>23% acima</strong> da sua média. Quer que eu sugira onde cortar?</p>
              </div>
              <div style={{ background: "#1D9E75", borderRadius: "14px 14px 4px 14px", padding: "10px 14px", maxWidth: "80%", alignSelf: "flex-end" }}>
                <p style={{ fontSize: 13, color: "#fff", lineHeight: 1.5 }}>Sim! E quanto preciso guardar por mês para minha reserva?</p>
              </div>
              <div style={{ background: "#f0fdf4", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", maxWidth: "85%" }}>
                <p style={{ fontSize: 13, color: "#0d2414", lineHeight: 1.5 }}>Com seus gastos de <strong>R$ 3.200/mês</strong>, sua reserva ideal é <strong>R$ 9.600</strong>. Guardando <strong>R$ 400/mês</strong>, você chega lá em 24 meses. Quer que eu crie essa meta pra você?</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="section-pad" style={{ padding: "100px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1D9E75", letterSpacing: "0.08em", textTransform: "uppercase" }}>Simples assim</span>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: "#0d2414", marginTop: 8, lineHeight: 1.2 }}>Em 3 passos você já tá no controle</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              { num: "01", emoji: "📝", title: "Registre seus gastos", desc: "Anote receitas e despesas em segundos. A IA categoriza automaticamente e identifica padrões no seu comportamento financeiro." },
              { num: "02", emoji: "💬", title: "Pergunte ao Assessor IA", desc: "\"Quanto gastei em alimentação?\" \"Consigo comprar um carro em 2 anos?\" Respostas reais baseadas nos seus dados — não conselhos genéricos." },
              { num: "03", emoji: "🎯", title: "Atinja suas metas", desc: "Crie objetivos e receba um plano personalizado. A IA monitora seu progresso e avisa quando você está desviando do caminho." },
            ].map(({ num, emoji, title, desc }) => (
              <div key={num} style={{ background: "#f8fdf9", border: "1px solid #e4f5e9", borderRadius: 20, padding: 32, position: "relative", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1D9E75"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(29,158,117,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e4f5e9"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                <div style={{ position: "absolute", top: -14, left: 28, background: "#1D9E75", color: "#fff", fontSize: 11, fontWeight: 900, padding: "4px 12px", borderRadius: 100 }}>Passo {num}</div>
                <div style={{ fontSize: 48, marginBottom: 16, marginTop: 8 }}>{emoji}</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0d2414", marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6b9e80", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section-pad" style={{ padding: "100px 24px", background: "#f0fdf4" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1D9E75", letterSpacing: "0.08em", textTransform: "uppercase" }}>Funcionalidades</span>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: "#0d2414", marginTop: 8 }}>Tudo que você precisa, num só lugar</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, desc, cor }) => (
              <div key={title} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e4f5e9", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: cor + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon size={22} color={cor} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0d2414", marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6b9e80", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="section-pad" style={{ padding: "100px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1D9E75", letterSpacing: "0.08em", textTransform: "uppercase" }}>Depoimentos</span>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: "#0d2414", marginTop: 8 }}>Quem já usa a iMoney</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {DEPOIMENTOS.map(({ nome, cargo, texto, avatar }) => (
              <div key={nome} style={{ background: "#f8fdf9", border: "1px solid #e4f5e9", borderRadius: 20, padding: 28 }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="#EF9F27" color="#EF9F27" />)}
                </div>
                <p style={{ fontSize: 15, color: "#0d2414", lineHeight: 1.7, marginBottom: 20, fontStyle: "italic" }}>"{texto}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>{avatar}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0d2414" }}>{nome}</div>
                    <div style={{ fontSize: 12, color: "#8db89d" }}>{cargo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECOS */}
      <section className="section-pad" style={{ padding: "100px 24px", background: "#f0fdf4" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1D9E75", letterSpacing: "0.08em", textTransform: "uppercase" }}>Planos</span>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: "#0d2414", marginTop: 8 }}>Comece grátis, escale quando quiser</h2>
            <p style={{ fontSize: 16, color: "#6b9e80", marginTop: 12 }}>Sem pegadinha. Cancele quando quiser.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {PLANOS.map(({ nome, preco, periodo, cor, features, cta, href, destaque }) => (
              <div key={nome} style={{ background: destaque ? "linear-gradient(135deg, #0a3d28, #1D9E75)" : "#fff", borderRadius: 24, padding: 32, border: destaque ? "none" : "2px solid #e4f5e9", position: "relative", boxShadow: destaque ? "0 20px 60px rgba(29,158,117,0.25)" : "none" }}>
                {destaque && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#EF9F27", color: "#fff", fontSize: 12, fontWeight: 800, padding: "5px 16px", borderRadius: 100, whiteSpace: "nowrap" }}>Mais popular ✨</div>}
                <div style={{ fontSize: 14, fontWeight: 700, color: destaque ? "#9FE1CB" : "#888", marginBottom: 8 }}>{nome}</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, color: destaque ? "#fff" : "#0d2414", lineHeight: 1 }}>{preco}</span>
                  <span style={{ fontSize: 14, color: destaque ? "rgba(255,255,255,0.7)" : "#888", marginBottom: 8 }}>{periodo}</span>
                </div>
                <div style={{ height: 1, background: destaque ? "rgba(255,255,255,0.15)" : "#e4f5e9", margin: "20px 0" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                  {features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: destaque ? "rgba(255,255,255,0.2)" : "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={12} color={destaque ? "#fff" : "#1D9E75"} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 14, color: destaque ? "rgba(255,255,255,0.9)" : "#444" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href={href} style={{ display: "block", textAlign: "center", background: destaque ? "#fff" : "#1D9E75", color: destaque ? "#1D9E75" : "#fff", fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 12, textDecoration: "none" }}>
                  {cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section className="section-pad" style={{ padding: "100px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1D9E75", letterSpacing: "0.08em", textTransform: "uppercase" }}>Blog</span>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: "#0d2414", marginTop: 8 }}>Aprenda sobre finanças</h2>
            <p style={{ fontSize: 16, color: "#6b9e80", marginTop: 12 }}>Artigos práticos sobre como organizar, investir e crescer seu dinheiro.</p>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link href="/blog" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#f0fdf4", border: "2px solid #1D9E75",
              color: "#085041", fontWeight: 800, fontSize: 16,
              padding: "16px 32px", borderRadius: 16, textDecoration: "none",
              transition: "all .2s",
            }}>
              📚 Ver todos os artigos →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section-pad" style={{ padding: "100px 24px", background: "linear-gradient(135deg, #0d2414 0%, #1D9E75 100%)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🧭</div>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: "#fff", marginBottom: 16, lineHeight: 1.2 }}>Pronto para tomar controle do seu dinheiro?</h2>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", marginBottom: 36, lineHeight: 1.7 }}>Crie sua conta grátis em menos de 1 minuto. Sem cartão, sem pegadinha, sem anúncio.</p>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#fff", color: "#1D9E75", fontWeight: 900, fontSize: 18, padding: "18px 40px", borderRadius: 16, textDecoration: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            Criar minha conta grátis <ArrowRight size={22} />
          </Link>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 32 }}>
            {[
              { valor: contador.usuarios.toLocaleString('pt-BR'), label: "usuários ativos" },
              { valor: contador.conversas.toLocaleString('pt-BR'), label: "conversas com IA" },
              { valor: "4.9★", label: "avaliação média" },
            ].map(({ valor, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{valor}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0a1a0f", padding: "40px 24px", textAlign: "center" }}>
        <Image src="/logo.png" alt="iMoney" width={100} height={30} style={{ objectFit: "contain", marginBottom: 16, opacity: 0.7 }} />
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
          {[["Privacidade", "/privacidade"], ["Termos", "/termos"], ["Blog", "/blog"], ["Entrar", "/login"]].map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none", fontWeight: 600 }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>© 2026 iMoney · Seu assessor financeiro com IA · imoney.ia.br</p>
      </footer>
    </div>
  );
}
