'use client';
import * as React from 'react';
import { C, FONT } from './tokens';
import { Button, Card, Icon, Money, GoalProgress } from './primitives';
const MOBILE_CSS = `
@media (max-width: 767px) {
  /* NavBar */
  .mkt-nav { padding: 12px 20px !important; }
  .mkt-nav-links { display: none !important; }

  /* Hero */
  .mkt-hero { grid-template-columns: 1fr !important; padding: 32px 20px 44px !important; gap: 32px !important; }
  .mkt-hero-h1 { font-size: 38px !important; line-height: 1.05 !important; margin: 16px 0 12px !important; }
  .mkt-hero-sub { font-size: 15px !important; }
  .mkt-hero-btns { flex-wrap: wrap !important; }
  .mkt-hero-bubble { display: none !important; }

  /* Feature grid */
  .mkt-feature-sect { padding: 48px 20px !important; }
  .mkt-feature-h2 { font-size: 28px !important; }
  .mkt-feature-p { font-size: 15px !important; }
  .mkt-feature-grid { grid-template-columns: 1fr !important; margin-top: 28px !important; }

  /* Dream showcase */
  .mkt-dream-sect { padding: 48px 20px !important; }
  .mkt-dream-h2 { font-size: 28px !important; margin-bottom: 24px !important; }
  .mkt-dream-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }

  /* Pricing */
  .mkt-pricing-sect { padding: 48px 20px !important; }
  .mkt-pricing-h2 { font-size: 26px !important; }
  .mkt-pricing-p { font-size: 14px !important; }
  .mkt-pricing-grid { grid-template-columns: 1fr !important; }

  /* Blog */
  .mkt-blog-sect { padding: 48px 20px !important; }
  .mkt-blog-header { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; margin-bottom: 20px !important; }
  .mkt-blog-grid { grid-template-columns: 1fr !important; }

  /* Footer */
  .mkt-footer { padding: 40px 20px 24px !important; }
  .mkt-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
  .mkt-footer-brand { grid-column: 1 / -1 !important; }
  .mkt-footer-bottom { flex-direction: column !important; gap: 4px !important; margin-top: 24px !important; }
}
`;

/* ───── NavBar ───── */
export function MarketingNavBar() {
  return (
    <>
      <style>{MOBILE_CSS}</style>
      <nav className="mkt-nav" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.hairline}`,
        padding: '14px 32px', fontFamily: FONT,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/icon.svg" alt="iMoney" width={36} height={36} style={{ borderRadius: 8, display: 'block' }}/>
          <span style={{ fontSize: 22, fontWeight: 800, color: C.green900, letterSpacing: '-0.02em' }}>iMoney</span>
        </div>
        <div className="mkt-nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="/#como-funciona" style={{ fontSize: 14, fontWeight: 700, color: C.green900, textDecoration: 'none', cursor: 'pointer' }}>Como funciona</a>
          <a href="/#sonhos" style={{ fontSize: 14, fontWeight: 700, color: C.green900, textDecoration: 'none', cursor: 'pointer' }}>Sonhos</a>
          <a href="/#precos" style={{ fontSize: 14, fontWeight: 700, color: C.green900, textDecoration: 'none', cursor: 'pointer' }}>Preços</a>
          <a href="/blog" style={{ fontSize: 14, fontWeight: 700, color: C.green900, textDecoration: 'none', cursor: 'pointer' }}>Blog</a>
        </div>
        <Button href="/login" style={{ padding: '10px 18px', fontSize: 14 }}>Acesso grátis</Button>
      </nav>
    </>
  );
}

/* ───── Hero ───── */
export function Hero() {
  return (
    <section className="mkt-hero" style={{
      padding: '64px 32px 80px', maxWidth: 1200, margin: '0 auto',
      display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'center', fontFamily: FONT,
    }}>
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: C.green50, color: C.green900, padding: '8px 14px',
          borderRadius: 999, fontSize: 13, fontWeight: 800,
        }}>🧭 IA que entende o seu sonho</div>
        <h1 className="mkt-hero-h1" style={{
          fontSize: 64, fontWeight: 800, color: C.green900,
          letterSpacing: '-0.03em', lineHeight: 1.02, margin: '20px 0 16px',
        }}>
          Seus sonhos<br/>têm um plano.
        </h1>
        <p className="mkt-hero-sub" style={{ fontSize: 19, color: C.ink2, lineHeight: 1.55, maxWidth: 480, margin: 0 }}>
          A iMoney transforma o que você quer — casa própria, viagem, independência — em metas concretas. Com Assessor IA 24h pelo seu projeto de vida.
        </p>
        <div className="mkt-hero-btns" style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <Button href="/login" style={{ padding: '16px 26px', fontSize: 16 }}>Acesso grátis</Button>
          <Button variant="ghost" href="#como-funciona" style={{ padding: '16px 26px', fontSize: 16 }}>Ver como funciona →</Button>
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 28, alignItems: 'center', fontSize: 13, color: C.ink2 }}>
          <span>⭐⭐⭐⭐⭐ 4.8 · 12k usuários</span>
          <span>· grátis para começar</span>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          background: C.green900, borderRadius: 32, padding: 24, color: '#fff',
          width: 320, boxShadow: '0 24px 80px rgba(26,58,26,0.20)', transform: 'rotate(-2deg)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Meta · Viagem Europa</div>
          <div style={{ fontSize: 36, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: 6 }}>R$ 8.750</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>de R$ 10.000 · 87,5%</div>
          <div style={{ marginTop: 14 }}><GoalProgress pct={87} dark/></div>
          <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: C.green500 }}>✨ Falta 2 meses</div>
        </div>
        <div className="mkt-hero-bubble" style={{
          position: 'absolute', top: 220, left: 40,
          background: '#fff', borderRadius: 18, padding: '14px 16px',
          boxShadow: '0 16px 40px rgba(26,58,26,0.12)',
          display: 'flex', gap: 10, alignItems: 'center',
          width: 280, transform: 'rotate(3deg)',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: C.green500, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧭</div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: C.green900 }}>Gui da iMoney</div>
            <div style={{ fontSize: 12, color: C.ink2 }}>&ldquo;Tá faltando só R$1.250 — bora?&rdquo;</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───── Feature grid ───── */
export function FeatureGrid() {
  const features = [
    { ico: 'target' as const,      title: 'Metas por sonho',    body: 'Vire "quero uma casa" em "R$750/mês por 48 meses". Concreto e fácil de seguir.' },
    { ico: 'compass' as const,     title: 'Assessor IA 24h',    body: 'O Gui responde dúvidas, recalcula rotas e celebra cada conquista — como um amigo.' },
    { ico: 'trending-up' as const, title: 'Visão de futuro',    body: 'Não é planilha do passado. É o caminho até onde você quer chegar.' },
    { ico: 'sparkles' as const,    title: 'Celebra cada passo', body: 'Cada R$ guardado conta. Marcos de 25%, 50%, 75%, 100% — sem culpa, só motivação.' },
  ];
  return (
    <section id="como-funciona" className="mkt-feature-sect" style={{ padding: '80px 32px', background: C.paper, fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.green500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>O que muda</div>
        <h2 className="mkt-feature-h2" style={{ fontSize: 44, fontWeight: 800, color: C.green900, letterSpacing: '-0.02em', margin: '8px 0 12px', lineHeight: 1.1, maxWidth: 720 }}>
          O primeiro app de finanças que trabalha pelo seu projeto de vida.
        </h2>
        <p className="mkt-feature-p" style={{ fontSize: 17, color: C.ink2, maxWidth: 620, lineHeight: 1.55, margin: 0 }}>
          Não é controle de gastos. É o caminho do sonho até a conquista.
        </p>
        <div className="mkt-feature-grid" style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {features.map(f => (
            <Card key={f.title} style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: C.green50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={f.ico} size={26} color={C.green500} stroke={2}/>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.green900 }}>{f.title}</div>
              <div style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.55 }}>{f.body}</div>
            </Card>
          ))}
        </div>
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <a
            href="#pwa-guide"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.green500, color: C.green900, fontFamily: FONT, fontWeight: 800, fontSize: 15, padding: '14px 28px', borderRadius: 100, textDecoration: 'none' }}
          >
            📲 Instale o aplicativo em sua tela de celular
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───── PWA Section ───── */
export function PWASection() {
  const [platform, setPlatform] = React.useState<'ios' | 'android'>('ios');
  const steps = {
    ios: [
      { emoji: '🌐', title: 'Abra no Safari', desc: 'Acesse imoney.ia.br pelo Safari — não funciona no Chrome ou Firefox no iOS.' },
      { emoji: '⬆️', title: 'Toque em "Compartilhar"', desc: 'Ícone na barra inferior: quadrado com seta pra cima.' },
      { emoji: '➕', title: '"Adicionar à Tela de Início"', desc: 'Role as opções, confirme o nome e toque em Adicionar.' },
      { emoji: '✅', title: 'Pronto!', desc: 'Ícone aparece na tela inicial e abre sem barra de endereço em tela cheia.' },
    ],
    android: [
      { emoji: '🌐', title: 'Abra no Chrome', desc: 'Acesse imoney.ia.br pelo Google Chrome.' },
      { emoji: '⋮', title: 'Toque em "Menu"', desc: 'Três pontos no canto superior direito.' },
      { emoji: '📲', title: '"Adicionar à tela inicial"', desc: 'Ou "Instalar app" em versões mais recentes. Confirme.' },
      { emoji: '✅', title: 'Pronto!', desc: 'Funciona como app nativo sem precisar da Play Store.' },
    ],
  }[platform];
  return (
    <section id="pwa-guide" style={{ padding: '80px 32px', background: '#0d1f0d', fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'rgba(0,200,83,0.15)', color: C.green500, fontWeight: 800, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 100, marginBottom: 20 }}>Use como app</div>
        <h2 style={{ fontSize: 40, fontWeight: 800, color: '#fff', margin: '0 0 10px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>Instale em 4 passos simples</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: '0 0 32px', lineHeight: 1.6, maxWidth: 520 }}>
          O iMoney funciona como app nativo — sem ocupar espaço da Play Store ou App Store.
        </p>
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.08)', borderRadius: 100, padding: 4, marginBottom: 32 }}>
          {(['ios', 'android'] as const).map(p => (
            <button key={p} onClick={() => setPlatform(p)} style={{ padding: '10px 24px', borderRadius: 100, border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 700, background: platform === p ? C.green500 : 'transparent', color: platform === p ? '#0d1f0d' : 'rgba(255,255,255,0.7)', transition: 'all 0.18s ease' }}>
              {p === 'ios' ? 'iPhone / iPad' : 'Android'}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.green500, color: '#0d1f0d', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 22 }}>{step.emoji}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{step.title}</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{step.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: '32px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
          Nenhum download necessário · Funciona offline · Atualizações automáticas
        </p>
      </div>
    </section>
  );
}

/* ───── Dream showcase ───── */
export function DreamShowcase() {
  const dreams = [
    { emoji: '🏠', title: 'Casa própria',           sub: 'Calcule sua entrada em 5 anos' },
    { emoji: '✈️', title: 'Viagem dos sonhos',      sub: 'Quanto custa e como juntar' },
    { emoji: '🚗', title: 'Trocar de carro',        sub: 'Financiar ou poupar — veja' },
    { emoji: '🛡️', title: 'Reserva de emergência',  sub: 'Pare de viver no limite' },
    { emoji: '💍', title: 'Casamento',              sub: 'Sem entrar em dívida' },
    { emoji: '🎓', title: 'Estudar fora',           sub: 'Planeje o intercâmbio' },
  ];
  return (
    <section id="sonhos" className="mkt-dream-sect" style={{ padding: '80px 32px', background: C.green900, color: '#fff', fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.green500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Qual é o seu sonho?</div>
        <h2 className="mkt-dream-h2" style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', margin: '8px 0 36px', lineHeight: 1.1, maxWidth: 720 }}>
          A iMoney conhece o sonho. E mostra o caminho.
        </h2>
        <div className="mkt-dream-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {dreams.map(d => (
            <a key={d.title} href="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8,
                cursor: 'pointer', transition: 'background 150ms',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                <div style={{ fontSize: 36 }}>{d.emoji}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{d.title}</div>
                <div style={{ fontSize: 13.5, opacity: 0.65 }}>{d.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Pricing ───── */
export function PricingTable() {
  return (
    <section id="precos" className="mkt-pricing-sect" style={{ padding: '80px 32px', background: '#fff', fontFamily: FONT }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.green500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Planos</div>
        <h2 className="mkt-pricing-h2" style={{ fontSize: 44, fontWeight: 800, color: C.green900, letterSpacing: '-0.02em', margin: '8px 0 16px', lineHeight: 1.1 }}>
          Comece grátis. Cresça com o Pro.
        </h2>
        <p className="mkt-pricing-p" style={{ fontSize: 16, color: C.ink2, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.55 }}>
          O essencial é gratuito. O Pro é menos de R$1 por dia — o preço de um café.
        </p>

        <div className="mkt-pricing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'left' }}>
          <div style={{ background: '#fff', border: `1.5px solid ${C.divider}`, borderRadius: 20, padding: 30 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.ink3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Gratuito</div>
            <h3 style={{ fontSize: 28, fontWeight: 800, color: C.green900, margin: '6px 0 14px', letterSpacing: '-0.02em' }}>Comece sua jornada</h3>
            <div><Money value="0" cents="00" size={36} color={C.green900}/></div>
            <div style={{ fontSize: 13, color: C.ink3, marginTop: 4 }}>para sempre</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Dashboard completo', 'Metas ilimitadas', 'Assessor IA · 10 msgs/dia', 'Transações manuais'].map(t => (
                <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14.5, color: C.ink }}>
                  <Icon name="check" size={18} color={C.green500} stroke={2.4}/>{t}
                </li>
              ))}
            </ul>
            <Button variant="dark" full href="/login">Acesso grátis</Button>
          </div>

          <div style={{
            background: 'linear-gradient(180deg, #f9a825 0%, #f4b54a 100%)',
            borderRadius: 20, padding: 30, color: '#2a1a00',
            boxShadow: '0 24px 60px rgba(249,168,37,0.30)', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 16, right: 20,
              background: '#2a1a00', color: C.gold, padding: '4px 10px',
              borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
            }}>RECOMENDADO</div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>✨ Pro</div>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: '6px 0 14px', letterSpacing: '-0.02em' }}>Invista no seu sonho</h3>
            <div>
              <Money value="29" cents="90" size={36} color="#2a1a00"/>
              <span style={{ fontSize: 14, fontWeight: 800, marginLeft: 4 }}>/mês</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>menos de R$1/dia</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Tudo do Gratuito +', 'Assessor IA ilimitado · 24h', 'Análises avançadas', 'Relatórios mensais', 'Suporte prioritário 4h'].map(t => (
                <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14.5 }}>
                  <Icon name="check" size={18} color="#2a1a00" stroke={2.4}/>{t}
                </li>
              ))}
            </ul>
            <Button variant="pro" full href="/dashboard/pro">✨ Virar Pro →</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───── Blog preview ───── */
export function BlogPreview() {
  const posts = [
    { eb: 'Sonhos financeiros',   title: 'Como juntar dinheiro para a casa própria em 5 anos', read: '6 min', emoji: '🏠' },
    { eb: 'Metas e planejamento', title: 'Método 50-30-20 explicado pro brasileiro real',       read: '5 min', emoji: '🎯' },
    { eb: 'Contexto Brasil',      title: 'O que é SELIC e como ela afeta os seus sonhos',       read: '4 min', emoji: '📊' },
  ];
  return (
    <section className="mkt-blog-sect" style={{ padding: '80px 32px', background: C.paper, fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="mkt-blog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.green500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Do blog iMoney</div>
            <h2 style={{ fontSize: 34, fontWeight: 800, color: C.green900, letterSpacing: '-0.02em', margin: '6px 0 0' }}>Aprenda enquanto sua meta cresce</h2>
          </div>
          <a href="/blog" style={{ fontSize: 14, fontWeight: 800, color: C.green500, cursor: 'pointer', textDecoration: 'none' }}>Ver todos os artigos →</a>
        </div>
        <div className="mkt-blog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {posts.map(p => (
            <a key={p.title} href="/blog" style={{ textDecoration: 'none' }}>
            <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
              <div style={{ height: 140, background: C.green50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>{p.emoji}</div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.green500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.eb}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.green900, lineHeight: 1.3 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: C.ink3, fontWeight: 700, marginTop: 'auto' }}>{p.read} de leitura</div>
              </div>
            </Card>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── MascotBussola ───── */
export function MascotBussola({ size = 120 }: { size?: number }) {
  return (
    <img
      src="/imoney/mascot-compass.svg"
      alt="Bússola — mascote da iMoney"
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  );
}

/* ───── BrandVoice ───── */
const VOICE_PAIRS = [
  {
    evitar: '"Suas despesas superaram o orçamento em 23%."',
    usar:   '"Ei! Você gastou um pouco mais este mês — quer ajustar sua meta?"',
  },
  {
    evitar: '"Você cometeu um erro financeiro."',
    usar:   '"Esse mês saiu diferente do planejado. Sem problema — vamos recalcular a rota."',
  },
  {
    evitar: '"Recomendamos diversificação do portfólio."',
    usar:   '"Que tal começar a investir? Com R$100/mês você já dá um passo enorme."',
  },
];
export function BrandVoice() {
  return (
    <section style={{ padding: '80px 32px', background: '#fff', fontFamily: FONT }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.green500, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Voz da marca</div>
        <h2 style={{ fontSize: 34, fontWeight: 800, color: C.green900, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Como a iMoney soa</h2>
        <p style={{ fontSize: 15, color: C.ink2, margin: '0 0 36px', lineHeight: 1.55 }}>Como a iMoney fala vs como um banco fala.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {VOICE_PAIRS.map((pair, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{
                background: '#fff5f5', borderLeft: '4px solid #c62828',
                borderRadius: '0 12px 12px 0', padding: '16px 20px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#c62828', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Evitar</div>
                <div style={{ fontSize: 14.5, color: '#3d1515', lineHeight: 1.55 }}>{pair.evitar}</div>
              </div>
              <div style={{
                background: C.green50, borderLeft: `4px solid ${C.green500}`,
                borderRadius: '0 12px 12px 0', padding: '16px 20px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.green500, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Usar</div>
                <div style={{ fontSize: 14.5, color: C.green900, lineHeight: 1.55 }}>{pair.usar}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Footer ───── */
export function Footer() {
  const cols = [
    { h: 'Produto',  l: [['Como funciona','#como-funciona'], ['Sonhos','#sonhos'], ['Preços','#precos']] },
    { h: 'Aprender', l: [['Blog','/blog']] },
    { h: 'Empresa',  l: [['Privacidade','/privacidade'], ['Termos','/termos']] },
  ];
  return (
    <footer className="mkt-footer" style={{ background: C.green900, color: '#fff', padding: '60px 32px 32px', fontFamily: FONT }}>
      <div className="mkt-footer-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 40 }}>
        <div className="mkt-footer-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon.svg" alt="iMoney" width={40} height={40} style={{ borderRadius: 9, display: 'block' }}/>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>iMoney</span>
          </div>
          <p style={{ fontSize: 13.5, opacity: 0.6, lineHeight: 1.55, marginTop: 14, maxWidth: 280 }}>
            A IA que cuida do seu projeto de vida. Construído no Brasil.
          </p>
        </div>
        {cols.map(col => (
          <div key={col.h}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>{col.h}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.l.map(([label, href]) => <li key={label}><a href={href} style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>{label}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mkt-footer-bottom" style={{
        borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 48, paddingTop: 20,
        display: 'flex', justifyContent: 'space-between', maxWidth: 1100, margin: '48px auto 0',
        fontSize: 12, color: 'rgba(255,255,255,0.5)',
      }}>
        <span>© 2026 iMoney · imoney.ia.br</span>
        <span>gui@imoney.ia.br</span>
      </div>
    </footer>
  );
}
