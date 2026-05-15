'use client';
import * as React from 'react';

const FONT = "'Nunito', sans-serif";
const GREEN = '#00C853';
const BG = '#0d1f0d';

type Platform = 'ios' | 'android';

const STEPS: Record<Platform, { emoji: string; title: string; desc: string }[]> = {
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
};

export function PWAInstallGuide() {
  const [open, setOpen] = React.useState(false);
  const [platform, setPlatform] = React.useState<Platform>('ios');
  const steps = STEPS[platform];

  return (
    <div style={{ marginTop: 32, fontFamily: FONT }}>
      {/* Link trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: FONT,
          fontSize: 15,
          fontWeight: 700,
          color: GREEN,
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        Instale o aplicativo em sua tela de celular
        <span style={{ fontSize: 12, transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {/* Expandable guide */}
      {open && (
        <div style={{ background: BG, borderRadius: 20, padding: '40px 36px', marginTop: 20 }}>
          {/* Badge */}
          <div style={{ display: 'inline-block', background: 'rgba(0,200,83,0.15)', color: GREEN, fontWeight: 800, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 100, marginBottom: 18 }}>
            Use como app
          </div>

          {/* Title + subtitle */}
          <h3 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 8px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Instale em 4 passos simples
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px', lineHeight: 1.6, maxWidth: 480 }}>
            O iMoney funciona como um app nativo — sem ocupar espaço da Play Store ou App Store.
          </p>

          {/* Toggle */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.08)', borderRadius: 100, padding: 4, marginBottom: 28 }}>
            {(['ios', 'android'] as Platform[]).map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 100,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 700,
                  background: platform === p ? GREEN : 'transparent',
                  color: platform === p ? '#0d1f0d' : 'rgba(255,255,255,0.7)',
                  transition: 'all 0.18s ease',
                }}
              >
                {p === 'ios' ? 'iPhone / iPad' : 'Android'}
              </button>
            ))}
          </div>

          {/* Steps grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 14,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: GREEN,
                    color: '#0d1f0d',
                    fontWeight: 800,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 20 }}>{step.emoji}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{step.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{step.desc}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p style={{ margin: '24px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
            Nenhum download necessário · Funciona offline · Atualizações automáticas
          </p>
        </div>
      )}
    </div>
  );
}
