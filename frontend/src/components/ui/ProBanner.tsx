'use client'

import Link from 'next/link'

interface ProBannerProps {
  feature: string
  descricao?: string
}

export function ProBanner({ feature, descricao }: ProBannerProps) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      textAlign: 'center', fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '48px 40px',
        boxShadow: '0 8px 40px rgba(29,158,117,0.12)',
        border: '2px solid #e4f5e9', maxWidth: 480, width: '100%',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'linear-gradient(135deg, #0a3d28, #1D9E75)',
          borderRadius: 20, padding: '4px 14px', marginBottom: 20,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>✨ iMoney Pro</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0d2414', margin: '0 0 12px', lineHeight: 1.3 }}>
          {feature} é exclusivo do Pro
        </h2>
        <p style={{ fontSize: 15, color: '#6b9e80', lineHeight: 1.7, margin: '0 0 28px' }}>
          {descricao ?? `Assine o iMoney Pro para ter acesso completo a ${feature} e muito mais.`}
        </p>
        <Link href="/dashboard/pro" style={{
          display: 'block', background: 'linear-gradient(135deg, #0a3d28, #1D9E75)',
          color: '#fff', fontWeight: 800, fontSize: 16,
          padding: '16px 32px', borderRadius: 14, textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(29,158,117,0.35)', marginBottom: 12,
        }}>
          Assinar Pro — R$ 14,90/mês →
        </Link>
        <Link href="/dashboard" style={{
          fontSize: 13, color: '#aaa', textDecoration: 'none', fontWeight: 600,
        }}>
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  )
}
