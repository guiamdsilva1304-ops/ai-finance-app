'use client';

import { useEffect, useState } from 'react';
import { captureRefFromUrl, saveRefManual, getStoredRef } from '@/lib/referral';
import { Logo } from '@/components/ui/Logo';
import { createSupabaseBrowser } from '@/lib/supabase';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --verde-escuro: #1a3a1a;
  --verde:        #00C853;
  --verde-dim:    #00a844;
  --dourado:      #d4940a;
  --preto:        #ffffff;
  --superficie:   #f4f8f4;
  --borda:        #d0e8d0;
  --texto:        #1a3a1a;
  --texto-muted:  #4a6a4a;
  --font-display: 'Bebas Neue', sans-serif;
  --font-body:    'Nunito', sans-serif;
}
html { scroll-behavior: smooth; }
body { background: var(--preto); color: var(--texto); font-family: var(--font-body); font-size: 16px; line-height: 1.6; overflow-x: hidden; }

nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(1rem,5vw,3rem); height: 64px; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--borda); box-shadow: 0 1px 12px rgba(0,0,0,0.06); }
.nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.nav-badge { background: var(--dourado); color: #fff; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 100px; text-transform: uppercase; }
.btn-nav { background: var(--verde); color: #fff; font-family: var(--font-body); font-weight: 800; font-size: 14px; padding: 8px 20px; border-radius: 8px; text-decoration: none; transition: background 0.2s; }
.btn-nav:hover { background: var(--verde-dim); }

.hero { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 100px clamp(1rem,5vw,3rem) 60px; position: relative; overflow: hidden; }
.hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 40% at 50% 60%, rgba(0,200,83,0.05) 0%, transparent 70%), repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(0,200,83,0.03) 50px); pointer-events: none; }
.hero::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: min(600px,90vw); height: min(600px,90vw); border-radius: 50%; border: 1px solid rgba(0,200,83,0.1); pointer-events: none; }
.hero-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: var(--dourado); margin-bottom: 20px; }
.hero-title { font-family: var(--font-display); font-size: clamp(3.5rem,12vw,9rem); line-height: 0.92; letter-spacing: 2px; color: var(--texto); margin-bottom: 8px; }
.hero-title .verde { color: var(--verde); }
.hero-title .dourado { color: var(--dourado); }
.hero-sub { font-size: clamp(1rem,2.5vw,1.25rem); color: var(--texto-muted); max-width: 520px; margin: 24px auto 40px; font-weight: 600; }
.hero-sub strong { color: var(--texto); }

.placar-wrapper { display: inline-flex; align-items: center; margin: 8px 0 32px; background: var(--superficie); border: 1px solid var(--borda); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
.placar-time { display: flex; flex-direction: column; align-items: center; padding: 12px 20px; min-width: 100px; }
.placar-bandeira { font-size: 28px; line-height: 1; }
.placar-nome { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--texto-muted); margin-top: 4px; }
.placar-centro { display: flex; flex-direction: column; align-items: center; padding: 12px 16px; border-left: 1px solid var(--borda); border-right: 1px solid var(--borda); }
.placar-gols { font-family: var(--font-display); font-size: clamp(2.5rem,8vw,4.5rem); letter-spacing: 8px; color: var(--verde); line-height: 1; }
.placar-gols .gol-a, .placar-gols .gol-b { display: inline-block; transition: transform 0.15s, opacity 0.15s; }
.placar-gols .sep { color: var(--borda); letter-spacing: 0; margin: 0 2px; }
.placar-status { font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--dourado); margin-top: 4px; animation: blink 1.2s step-start infinite; }
@keyframes blink { 50% { opacity: 0; } }
.placar-minuto { font-size: 10px; color: var(--texto-muted); letter-spacing: 1px; margin-top: 2px; }

.btn-hero { display: inline-flex; align-items: center; gap: 10px; background: var(--verde); color: #fff; font-family: var(--font-body); font-weight: 900; font-size: clamp(1rem,2.5vw,1.15rem); padding: 16px 36px; border-radius: 12px; text-decoration: none; transition: background 0.2s, transform 0.15s, box-shadow 0.2s; box-shadow: 0 4px 24px rgba(0,200,83,0.3); }
.btn-hero:hover { background: var(--verde-dim); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,200,83,0.4); }
.btn-hero svg { width: 20px; height: 20px; flex-shrink: 0; }
.hero-note { margin-top: 14px; font-size: 13px; color: var(--texto-muted); }

.scroll-cue { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--texto-muted); font-size: 11px; animation: float 2.5s ease-in-out infinite; }
@keyframes float { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(6px)} }

section { padding: clamp(64px,10vw,120px) clamp(1rem,5vw,3rem); }
.section-label { font-size: 11px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: var(--verde); margin-bottom: 12px; }
.section-title { font-family: var(--font-display); font-size: clamp(2.2rem,6vw,4rem); line-height: 1; letter-spacing: 1px; margin-bottom: 48px; color: var(--texto); }

.steps { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 2px; max-width: 1000px; margin: 0 auto; background: var(--borda); border: 1px solid var(--borda); border-radius: 16px; overflow: hidden; }
.step { background: var(--superficie); padding: 36px 28px; position: relative; transition: background 0.2s; }
.step:hover { background: #eaf5ea; }
.step-num { font-family: var(--font-display); font-size: 5rem; line-height: 1; color: rgba(0,200,83,0.1); position: absolute; top: 16px; right: 20px; pointer-events: none; transition: color 0.2s; }
.step:hover .step-num { color: rgba(0,200,83,0.18); }
.step-icon { font-size: 32px; margin-bottom: 16px; display: block; }
.step-title { font-weight: 800; font-size: 1.1rem; color: var(--texto); margin-bottom: 8px; }
.step-desc { font-size: 0.9rem; color: var(--texto-muted); line-height: 1.5; }

.pontuacao-section { background: var(--superficie); }
.pontuacao-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 16px; max-width: 800px; margin: 0 auto; }
.pontos-card { border-radius: 16px; padding: 32px 24px; text-align: center; border: 1px solid var(--borda); }
.pontos-card.exato { background: linear-gradient(135deg,#e8f5e9,#c8e6c9); border-color: var(--verde); }
.pontos-card.resultado { background: linear-gradient(135deg,#fffde7,#fff9c4); border-color: var(--dourado); }
.pontos-card.errou { background: #f5f5f5; border-color: #ddd; }
.pontos-num { font-family: var(--font-display); font-size: 5rem; line-height: 1; margin-bottom: 4px; }
.pontos-card.exato .pontos-num { color: var(--verde); }
.pontos-card.resultado .pontos-num { color: var(--dourado); }
.pontos-card.errou .pontos-num { color: #ccc; }
.pontos-label { font-weight: 800; font-size: 0.95rem; margin-bottom: 8px; color: var(--texto); }
.pontos-desc { font-size: 0.82rem; color: var(--texto-muted); }

.premio-section { text-align: center; }
.premio-card { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg,#0d2a0d 0%,#1a3a1a 50%,#0d2a0d 100%); border: 1px solid var(--verde); border-radius: 24px; padding: clamp(40px,6vw,72px) clamp(24px,5vw,64px); position: relative; overflow: hidden; box-shadow: 0 0 60px rgba(0,200,83,0.15); }
.trophy { font-size: 64px; margin-bottom: 16px; display: block; }
.premio-titulo { font-family: var(--font-display); font-size: clamp(2rem,5vw,3.5rem); color: #F9A825; margin-bottom: 8px; letter-spacing: 1px; }
.premio-desc { font-size: 1.05rem; color: #a0c8a0; max-width: 380px; margin: 0 auto 32px; }
.premio-desc strong { color: #e8f5e8; }
.premio-vencedores { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
.vencedor-badge { display: flex; align-items: center; gap: 8px; background: rgba(0,200,83,0.1); border: 1px solid rgba(0,200,83,0.3); border-radius: 100px; padding: 8px 18px; font-weight: 700; font-size: 0.9rem; color: #e8f5e8; }
.vencedor-badge .pos { color: #F9A825; font-family: var(--font-display); font-size: 1.1rem; }

.ranking-section { background: var(--superficie); }
.ranking-table { max-width: 680px; margin: 0 auto; border: 1px solid var(--borda); border-radius: 16px; overflow: hidden; }
.ranking-header { display: grid; grid-template-columns: 48px 1fr 80px 80px; padding: 12px 20px; background: var(--borda); font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: var(--texto-muted); }
.ranking-row { display: grid; grid-template-columns: 48px 1fr 80px 80px; padding: 16px 20px; border-bottom: 1px solid var(--borda); align-items: center; transition: background 0.15s; }
.ranking-row:last-child { border-bottom: none; }
.ranking-row:hover { background: rgba(0,200,83,0.04); }
.ranking-row.top1 { background: rgba(212,148,10,0.07); }
.ranking-row.top2 { background: rgba(192,192,192,0.07); }
.ranking-row.top3 { background: rgba(205,127,50,0.05); }
.rank-pos { font-family: var(--font-display); font-size: 1.4rem; color: var(--texto-muted); }
.rank-pos.gold { color: var(--dourado); }
.rank-pos.silver { color: #888; }
.rank-pos.bronze { color: #a0724a; }
.rank-nome { font-weight: 700; font-size: 0.95rem; color: var(--texto); }
.rank-acertos { text-align: center; font-size: 0.85rem; color: var(--texto-muted); }
.rank-pts { text-align: right; font-family: var(--font-display); font-size: 1.5rem; color: var(--verde); }
.ranking-overlay { text-align: center; padding: 32px 20px; background: linear-gradient(to top, var(--superficie) 60%, transparent); margin-top: -80px; position: relative; }
.ranking-overlay p { color: var(--texto-muted); font-size: 0.95rem; margin-bottom: 16px; }

.cta-section { text-align: center; background: var(--superficie); }
.cta-title { font-family: var(--font-display); font-size: clamp(2.5rem,8vw,6rem); line-height: 0.95; letter-spacing: 2px; margin-bottom: 20px; color: var(--texto); }
.cta-title .verde { color: var(--verde); }
.cta-sub { font-size: 1rem; color: var(--texto-muted); margin-bottom: 36px; max-width: 400px; margin-left: auto; margin-right: auto; }

footer { padding: 32px clamp(1rem,5vw,3rem); border-top: 1px solid var(--borda); display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; background: var(--preto); }
.footer-text { font-size: 13px; color: var(--texto-muted); }
.footer-link { color: var(--verde); text-decoration: none; font-size: 13px; }
.footer-link:hover { text-decoration: underline; }

.center { text-align: center; }
.mt-8 { margin-top: 8px; }

@media (max-width: 600px) {
  .ranking-header, .ranking-row { grid-template-columns: 40px 1fr 60px; }
  .rank-acertos { display: none; }
  .nav-badge { display: none; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

.hero-content { animation: fadeUp 0.7s ease both; }
@keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
.step { opacity:0; transform:translateY(20px); transition: opacity 0.5s, transform 0.5s; }
.step.visible { opacity:1; transform:translateY(0); }
`;

export default function BolaoPage() {
  const [refCode, setRefCode] = useState('');
  const [myRefCode, setMyRefCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Busca o próprio referral_code se estiver logado
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.referral_code) setMyRefCode(data.referral_code);
        });
    });
  }, []);

  function copyLink() {
    if (!myRefCode) return;
    navigator.clipboard.writeText(`https://imoney.ia.br/bolao?ref=${myRefCode}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRefChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    setRefCode(val);
  }

  function handleRefBlur() {
    if (refCode) saveRefManual(refCode);
  }

  useEffect(() => {
    captureRefFromUrl();
    const stored = getStoredRef();
    if (stored) setRefCode(stored);
    const partidas: Array<{
      casa: string; casaNome: string; fora: string; foraNome: string;
      golC: number; golF: number; min: number;
    }> = [
      { casa: '🇧🇷', casaNome: 'Brasil',   fora: '🇦🇷', foraNome: 'Argentina', golC: 2, golF: 1, min: 73 },
      { casa: '🇵🇹', casaNome: 'Portugal', fora: '🇫🇷', foraNome: 'França',    golC: 1, golF: 1, min: 55 },
      { casa: '🇩🇪', casaNome: 'Alemanha', fora: '🇪🇸', foraNome: 'Espanha',   golC: 0, golF: 2, min: 88 },
      { casa: '🇧🇷', casaNome: 'Brasil',   fora: '🇺🇾', foraNome: 'Uruguai',   golC: 3, golF: 0, min: 67 },
      { casa: '🇫🇷', casaNome: 'França',   fora: '🇦🇷', foraNome: 'Argentina', golC: 2, golF: 2, min: 90 },
    ];

    let idx = 0;

    function animaGol(el: HTMLElement | null, valor: number) {
      if (!el) return;
      el.style.transform = 'translateY(-8px)';
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = String(valor);
        el.style.transform = 'translateY(8px)';
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
          el.style.transform = 'translateY(0)';
          el.style.opacity = '1';
        });
      }, 180);
      setTimeout(() => { el.style.transition = ''; }, 450);
    }

    function trocarPartida() {
      idx = (idx + 1) % partidas.length;
      const p = partidas[idx];
      const casaB = document.querySelector<HTMLElement>('.placar-time:first-child .placar-bandeira');
      const casaN = document.querySelector<HTMLElement>('.placar-time:first-child .placar-nome');
      const foraB = document.querySelector<HTMLElement>('.placar-time:last-child .placar-bandeira');
      const foraN = document.querySelector<HTMLElement>('.placar-time:last-child .placar-nome');
      const elMin = document.getElementById('minuto');
      if (casaB) casaB.textContent = p.casa;
      if (casaN) casaN.textContent = p.casaNome;
      if (foraB) foraB.textContent = p.fora;
      if (foraN) foraN.textContent = p.foraNome;
      animaGol(document.getElementById('golA'), p.golC);
      animaGol(document.getElementById('golB'), p.golF);
      if (elMin) elMin.textContent = p.min + "'";
    }

    const t1 = setInterval(trocarPartida, 3200);
    const t2 = setInterval(() => {
      const p = partidas[idx];
      if (p.min < 90) {
        p.min++;
        const el = document.getElementById('minuto');
        if (el) el.textContent = p.min + "'";
      }
    }, 8000);

    const steps = document.querySelectorAll('.step');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    steps.forEach(s => obs.observe(s));

    return () => { clearInterval(t1); clearInterval(t2); obs.disconnect(); };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav>
        <a href="https://imoney.ia.br" className="nav-logo" aria-label="iMoney">
          <Logo size={28} showText={true} dark={false} />
        </a>
        <span className="nav-badge">⚽ Copa 2026</span>
        <a href="/login?tab=register&next=/dashboard/bolao" className="btn-nav">Participar grátis</a>
      </nav>

      <section className="hero" aria-label="Bolão iMoney Copa do Mundo 2026">
        <div className="hero-content">
          <p className="hero-eyebrow">⚽ Bolão Oficial · Copa do Mundo 2026</p>
          <h1 className="hero-title">
            SEU<br />
            <span className="verde">PALPITE</span><br />
            <span className="dourado">VALE OURO</span>
          </h1>

          <div className="placar-wrapper" aria-label="Placar animado">
            <div className="placar-time">
              <span className="placar-bandeira">🇧🇷</span>
              <span className="placar-nome">Brasil</span>
            </div>
            <div className="placar-centro">
              <div className="placar-gols">
                <span className="gol-a" id="golA">2</span>
                <span className="sep">–</span>
                <span className="gol-b" id="golB">1</span>
              </div>
              <div className="placar-status">ao vivo</div>
              <div className="placar-minuto" id="minuto">73&apos;</div>
            </div>
            <div className="placar-time">
              <span className="placar-bandeira">🇦🇷</span>
              <span className="placar-nome">Argentina</span>
            </div>
          </div>

          <p className="hero-sub">
            Palpite jogo a jogo, suba no ranking e concorra a uma{' '}
            <strong>assinatura vitalícia da iMoney.</strong><br />
            Top 3 ganham prêmios reais. Totalmente grátis para participar.
          </p>

          <a href="/login?tab=register&next=/dashboard/bolao" className="btn-hero">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            Criar conta e participar
          </a>

          <p className="hero-note">
            Já tem conta?{' '}
            <a href="/login?next=/dashboard/bolao" style={{ color: 'var(--verde)', textDecoration: 'none', fontWeight: 700 }}>
              Entre e palpite agora →
            </a>
          </p>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span style={{ letterSpacing: '2px', fontSize: '10px', textTransform: 'uppercase' }}>Como funciona</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      <section aria-labelledby="como-funciona">
        <div className="center">
          <p className="section-label">Como funciona</p>
          <h2 className="section-title" id="como-funciona">Simples assim</h2>
        </div>
        <div className="steps">
          <div className="step">
            <span className="step-num" aria-hidden="true">1</span>
            <span className="step-icon">📱</span>
            <h3 className="step-title">Crie sua conta</h3>
            <p className="step-desc">Cadastre-se gratuitamente na iMoney. Leva menos de 1 minuto.</p>
          </div>
          <div className="step">
            <span className="step-num" aria-hidden="true">2</span>
            <span className="step-icon">⚽</span>
            <h3 className="step-title">Palpite nos jogos</h3>
            <p className="step-desc">Para cada jogo, coloque o placar que você acha que vai acontecer — antes da bola rolar.</p>
          </div>
          <div className="step">
            <span className="step-num" aria-hidden="true">3</span>
            <span className="step-icon">📊</span>
            <h3 className="step-title">Acompanhe o ranking</h3>
            <p className="step-desc">Veja sua posição em tempo real. Quanto mais palpites certos, mais alto você sobe.</p>
          </div>
          <div className="step">
            <span className="step-num" aria-hidden="true">4</span>
            <span className="step-icon">🏆</span>
            <h3 className="step-title">Ganhe vitalício</h3>
            <p className="step-desc">Top 3 ganham prêmios reais: Premium vitalício, Pro vitalício e desconto exclusivo de 1 ano.</p>
          </div>
        </div>
      </section>

      <section className="pontuacao-section" aria-labelledby="pontuacao">
        <div className="center">
          <p className="section-label">Sistema de pontos</p>
          <h2 className="section-title" id="pontuacao">Quanto vale cada acerto</h2>
        </div>
        <div className="pontuacao-grid">
          <div className="pontos-card exato">
            <div className="pontos-num">3</div>
            <div className="pontos-label">Placar exato</div>
            <div className="pontos-desc">Acertou o placar certinho?<br />3 pontos. Sem discussão.</div>
          </div>
          <div className="pontos-card resultado">
            <div className="pontos-num">1</div>
            <div className="pontos-label">Resultado certo</div>
            <div className="pontos-desc">Vitória, empate ou derrota.<br />Saiu certo, 1 ponto.</div>
          </div>
          <div className="pontos-card errou">
            <div className="pontos-num">0</div>
            <div className="pontos-label">Errou</div>
            <div className="pontos-desc">Não tem ponto negativo.<br />Próximo jogo é nova chance.</div>
          </div>
        </div>
      </section>

      <section className="premio-section" aria-labelledby="premio">
        <p className="section-label">O prêmio</p>
        <h2 className="section-title" id="premio" style={{ marginBottom: '40px' }}>Vale mais que um título</h2>
        <div className="premio-card">
          <span className="trophy" aria-hidden="true">🏆</span>
          <div className="premio-titulo">PRÊMIOS QUE VALEM</div>
          <p className="premio-desc">
            Quanto mais alto você terminar, maior o prêmio. E o campeão leva o <strong>topo da linha.</strong>
          </p>
          <div className="premio-vencedores">
            <div className="vencedor-badge" style={{background:'rgba(249,168,37,0.15)', borderColor:'rgba(249,168,37,0.5)'}}>
              <span className="pos">🥇</span> Premium vitalício
            </div>
            <div className="vencedor-badge">
              <span className="pos">🥈</span> Pro vitalício
            </div>
            <div className="vencedor-badge" style={{background:'rgba(0,200,83,0.06)', fontSize:'0.82rem'}}>
              <span className="pos">🥉</span> 30% off Pro <em>ou</em> 50% off Premium · 1 ano
            </div>
          </div>
          <a href="/login?tab=register&next=/dashboard/bolao" className="btn-hero" style={{ display: 'inline-flex' }}>
            Quero participar
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', marginLeft: '8px' }}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>

      <section className="ranking-section" aria-labelledby="ranking">
        <div className="center">
          <p className="section-label">Ranking ao vivo</p>
          <h2 className="section-title" id="ranking">Quem está na frente</h2>
        </div>
        <div className="ranking-table" role="table" aria-label="Ranking preview">
          <div className="ranking-header" role="row">
            <span>#</span><span>Participante</span>
            <span style={{ textAlign: 'center' }}>Acertos</span>
            <span style={{ textAlign: 'right' }}>Pts</span>
          </div>
          <div className="ranking-row top1" role="row"><span className="rank-pos gold">1</span><span className="rank-nome">Marina S.</span><span className="rank-acertos">🎯 8</span><span className="rank-pts">24</span></div>
          <div className="ranking-row top2" role="row"><span className="rank-pos silver">2</span><span className="rank-nome">Rafael M.</span><span className="rank-acertos">🎯 7</span><span className="rank-pts">19</span></div>
          <div className="ranking-row top3" role="row"><span className="rank-pos bronze">3</span><span className="rank-nome">Ana C.</span><span className="rank-acertos">🎯 6</span><span className="rank-pts">16</span></div>
          <div className="ranking-row" role="row"><span className="rank-pos">4</span><span className="rank-nome">João P.</span><span className="rank-acertos">🎯 6</span><span className="rank-pts">14</span></div>
          <div className="ranking-row" role="row" style={{ opacity: 0.5 }}><span className="rank-pos">5</span><span className="rank-nome">Beatriz L.</span><span className="rank-acertos">🎯 5</span><span className="rank-pts">11</span></div>
        </div>
        <div className="ranking-overlay">
          <p>Crie sua conta para entrar no ranking.</p>
          <a href="/login?tab=register&next=/dashboard/bolao" className="btn-hero" style={{ display: 'inline-flex', fontSize: '0.95rem', padding: '14px 28px' }}>
            Entrar no ranking
          </a>
        </div>
      </section>

      {myRefCode && (
        <section aria-labelledby="indique" style={{ textAlign: 'center', background: '#fff', padding: 'clamp(64px,10vw,120px) clamp(1rem,5vw,3rem)' }}>
          <p className="section-label">Indique e ganhe</p>
          <h2 className="section-title" id="indique" style={{ marginBottom: 16 }}>Leve amigos,<br />suba no ranking</h2>
          <p style={{ color: 'var(--texto-muted)', fontSize: '1rem', maxWidth: 440, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Cada amigo que entrar pelo seu link vale pontos extras no ranking.
            Invista no seu sonho — o 3º lugar do ranking geral leva desconto na assinatura iMoney por 1 ano.
          </p>
          <div style={{
            background: 'var(--superficie)', border: '2px solid var(--borda)',
            borderRadius: 20, padding: 'clamp(28px,5vw,48px)',
            display: 'inline-block', minWidth: 'min(360px, 90vw)', textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,200,83,0.08)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--texto-muted)', marginBottom: 8 }}>
              Seu código de indicação
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem,9vw,4rem)',
              color: 'var(--verde)', letterSpacing: 8, lineHeight: 1, marginBottom: 20,
            }}>
              {myRefCode}
            </div>
            <div style={{
              background: '#fff', border: '1px solid var(--borda)', borderRadius: 10,
              padding: '10px 16px', fontSize: 13, color: 'var(--texto-muted)',
              marginBottom: 20, wordBreak: 'break-all', fontFamily: 'monospace',
              letterSpacing: 0.5,
            }}>
              imoney.ia.br/bolao?ref={myRefCode}
            </div>
            <button
              onClick={copyLink}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 15,
                background: copied ? '#e8f5e9' : 'var(--verde)',
                color: copied ? 'var(--verde)' : '#fff',
                outline: copied ? '1px solid var(--verde)' : 'none',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {copied ? '✓ Link copiado!' : '🔗 Copiar link de indicação'}
            </button>
          </div>
        </section>
      )}

      <section className="cta-section">
        <p className="section-label">Falta pouco</p>
        <h2 className="cta-title">
          O BRASIL<br />
          <span className="verde">PRECISA</span><br />
          DE VOCÊ
        </h2>
        <p className="cta-sub">Palpite nos jogos e dispute o Premium vitalício.</p>
        <div style={{ margin: '0 auto 24px', maxWidth: '320px', textAlign: 'left' }}>
          <label htmlFor="ref-code" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--texto-muted)', marginBottom: '6px' }}>
            Tem um código de indicação? <span style={{ fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            id="ref-code"
            type="text"
            value={refCode}
            onChange={handleRefChange}
            onBlur={handleRefBlur}
            maxLength={7}
            placeholder="Ex: ABC1234"
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#fff',
              border: '1px solid var(--borda)',
              borderRadius: '10px',
              color: 'var(--texto)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              letterSpacing: '2px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <a href="/login" className="btn-hero" style={{ display: 'inline-flex' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
          </svg>
          Criar conta grátis — é agora
        </a>
        <p className="hero-note mt-8">Sem cartão de crédito. Sem taxa de inscrição.</p>
      </section>

      <footer>
        <span className="footer-text">© 2026 iMoney · Bolão Copa do Mundo</span>
        <a href="https://imoney.ia.br" className="footer-link">imoney.ia.br</a>
      </footer>
    </>
  );
}
