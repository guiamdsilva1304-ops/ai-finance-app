'use client';
import * as React from 'react';
import { C, FONT } from './tokens';
import { Button, Card, Icon, Money, GoalProgress } from './primitives';

/* ───── NavBar ───── */
export function MarketingNavBar({ onCta }: { onCta?: () => void }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.hairline}`,
      padding: '14px 32px', fontFamily: FONT,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/imoney/logo-icon-512.png" alt="iMoney" width={36} height={36} style={{ borderRadius: 8, display: 'block' }}/>
        <span style={{ fontSize: 22, fontWeight: 800, color: C.green900, letterSpacing: '-0.02em' }}>iMoney</span>
      </div>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <a style={{ fontSize: 14, fontWeight: 700, color: C.green900, textDecoration: 'none', cursor: 'pointer' }}>Como funciona</a>
        <a style={{ fontSize: 14, fontWeight: 700, color: C.green900, textDecoration: 'none', cursor: 'pointer' }}>Sonhos</a>
        <a style={{ fontSize: 14, fontWeight: 700, color: C.green900, textDecoration: 'none', cursor: 'pointer' }}>Preços</a>
        <a style={{ fontSize: 14, fontWeight: 700, color: C.green900, textDecoration: 'none', cursor: 'pointer' }}>Blog</a>
        <Button onClick={onCta} style={{ padding: '10px 18px', fontSize: 14 }}>Acesso grátis</Button>
      </div>
    </nav>
  );
}

/* ───── Hero ───── */
export function Hero({ onCta }: { onCta?: () => void }) {
  return (
    <section style={{
      padding: '64px 32px 80px', maxWidth: 1200, margin: '0 auto',
      display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'center', fontFamily: FONT,
    }}>
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: C.green50, color: C.green900, padding: '8px 14px',
          borderRadius: 999, fontSize: 13, fontWeight: 800,
        }}>🧭 IA que entende o seu sonho</div>
        <h1 style={{
          fontSize: 64, fontWeight: 800, color: C.green900,
          letterSpacing: '-0.03em', lineHeight: 1.02, margin: '20px 0 16px',
        }}>
          Seus sonhos<br/>têm um plano.
        </h1>
        <p style={{ fontSize: 19, color: C.ink2, lineHeight: 1.55, maxWidth: 480, margin: 0 }}>
          A iMoney transforma o que você quer — casa própria, viagem, independência — em metas concretas. Com Assessor IA 24h pelo seu projeto de vida.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <Button onClick={onCta} style={{ padding: '16px 26px', fontSize: 16 }}>Acesso grátis</Button>
          <Button variant="ghost" style={{ padding: '16px 26px', fontSize: 16 }}>Ver como funciona →</Button>
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
        <div style={{
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
    <section style={{ padding: '80px 32px', background: C.paper, fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.green500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>O que muda</div>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: C.green900, letterSpacing: '-0.02em', margin: '8px 0 12px', lineHeight: 1.1, maxWidth: 720 }}>
          O primeiro app de finanças que trabalha pelo seu projeto de vida.
        </h2>
        <p style={{ fontSize: 17, color: C.ink2, maxWidth: 620, lineHeight: 1.55, margin: 0 }}>
          Não é controle de gastos. É o caminho do sonho até a conquista.
        </p>
        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
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
    <section style={{ padding: '80px 32px', background: C.green900, color: '#fff', fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.green500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Qual é o seu sonho?</div>
        <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', margin: '8px 0 36px', lineHeight: 1.1, maxWidth: 720 }}>
          A iMoney conhece o sonho. E mostra o caminho.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {dreams.map(d => (
            <div key={d.title} style={{
              padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: 36 }}>{d.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{d.title}</div>
              <div style={{ fontSize: 13.5, opacity: 0.65 }}>{d.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Pricing ───── */
export function PricingTable({ onCta }: { onCta?: () => void }) {
  return (
    <section style={{ padding: '80px 32px', background: '#fff', fontFamily: FONT }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.green500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Planos</div>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: C.green900, letterSpacing: '-0.02em', margin: '8px 0 16px', lineHeight: 1.1 }}>
          Comece grátis. Cresça com o Pro.
        </h2>
        <p style={{ fontSize: 16, color: C.ink2, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.55 }}>
          O essencial é gratuito. O Pro é menos de R$1 por dia — o preço de um café.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'left' }}>
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
            <Button variant="dark" full onClick={onCta}>Acesso grátis</Button>
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
            <Button variant="dark" full>Virar Pro →</Button>
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
    <section style={{ padding: '80px 32px', background: C.paper, fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.green500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Do blog iMoney</div>
            <h2 style={{ fontSize: 34, fontWeight: 800, color: C.green900, letterSpacing: '-0.02em', margin: '6px 0 0' }}>Aprenda enquanto sua meta cresce</h2>
          </div>
          <a style={{ fontSize: 14, fontWeight: 800, color: C.green500, cursor: 'pointer' }}>Ver todos os artigos →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {posts.map(p => (
            <Card key={p.title} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 140, background: C.green50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>{p.emoji}</div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.green500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.eb}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.green900, lineHeight: 1.3 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: C.ink3, fontWeight: 700, marginTop: 'auto' }}>{p.read} de leitura</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Footer ───── */
export function Footer() {
  const cols = [
    { h: 'Produto',  l: ['Como funciona', 'Sonhos', 'Preços', 'Baixar app'] },
    { h: 'Aprender', l: ['Blog', 'Calculadoras', 'Glossário'] },
    { h: 'Empresa',  l: ['Contato', 'Privacidade', 'Termos'] },
  ];
  return (
    <footer style={{ background: C.green900, color: '#fff', padding: '60px 32px 32px', fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/imoney/logo-icon-512.png" alt="iMoney" width={40} height={40} style={{ borderRadius: 9, display: 'block' }}/>
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
              {col.l.map(item => <li key={item} style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', cursor: 'pointer' }}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{
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
