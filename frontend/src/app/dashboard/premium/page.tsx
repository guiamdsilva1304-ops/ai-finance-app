'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'

const FEATURES_PREMIUM = [
  'Tudo do plano Pro',
  'Assessor IA ilimitado',
  'Relatório mensal inteligente em PDF',
  'Exportação de dados em CSV',
  'Histórico completo ilimitado',
  'Suporte prioritário',
]

export default function PremiumPage() {
  const supabase = createSupabaseBrowser()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [plano, setPlano] = useState<string>('free')

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          setUserEmail(user.email ?? null)
          const { data } = await supabase
            .from('user_profiles')
            .select('plan')
            .eq('id', user.id)
            .single()
          if (data?.plan) setPlano(data.plan)
        }
      } catch (e) {
        console.error('[Premium] Erro ao carregar usuario:', e)
      } finally {
        setUserLoaded(true)
      }
    }
    load()
  }, [])

  async function assinar() {
    if (!userId || !userEmail) {
      window.location.href = '/login'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email: userEmail }),
      })
      const data = await res.json()
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank')
      } else {
        alert('Erro: ' + (data.error ?? 'Tente novamente.'))
      }
    } catch {
      alert('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: '#f8f9f8', fontFamily: "'Nunito', sans-serif", padding: '0 0 80px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #78350f 0%, #F59E0B 100%)', padding: '40px 20px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 16px', marginBottom: 20 }}>
            <span style={{ fontSize: 14 }}>⭐</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FEF3C7', letterSpacing: '0.05em' }}>iMoney Premium</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.15 }}>
            Controle total das suas<br />
            <span style={{ color: '#FDE68A' }}>finanças com IA</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', margin: '0 auto', maxWidth: 480, lineHeight: 1.6 }}>
            Invista no seu futuro por menos de R$2/dia
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>

        {/* Card de preço */}
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 32px rgba(245,158,11,0.2)', border: '2px solid #F59E0B', marginTop: -28, marginBottom: 20, position: 'relative', zIndex: 10 }}>
          <div style={{ background: 'linear-gradient(135deg, #78350f 0%, #F59E0B 100%)', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>R$</span>
              <span style={{ fontSize: 56, fontWeight: 900, color: '#fff', lineHeight: 1 }}>39,90</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>/mês</span>
            </div>
            <div style={{ fontSize: 13, color: '#FDE68A', marginTop: 4 }}>
              Menos de R$2 por dia · Cancele quando quiser
            </div>
          </div>
          <div style={{ padding: '24px 28px' }}>
            {FEATURES_PREMIUM.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: '#92400E', fontWeight: 900 }}>✓</span>
                </div>
                <span style={{ fontSize: 14, color: '#1a1a1a', fontWeight: i < 1 ? 600 : 400 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {plano === 'premium' ? (
          <div style={{ background: '#FEF3C7', borderRadius: 16, padding: '20px 28px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 22 }}>⭐</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#78350f', marginTop: 8 }}>Você já é Premium!</div>
            <div style={{ fontSize: 13, color: '#92400E', marginTop: 4 }}>Aproveite todos os recursos exclusivos.</div>
          </div>
        ) : (
          <>
            <button onClick={assinar} disabled={loading || !userLoaded}
              style={{
                width: '100%', padding: '18px 0',
                background: !userLoaded ? '#e8ede8' : loading ? '#ccc' : 'linear-gradient(135deg, #78350f 0%, #F59E0B 100%)',
                color: !userLoaded || loading ? '#aaa' : '#fff',
                border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 800,
                cursor: loading || !userLoaded ? 'not-allowed' : 'pointer',
                marginBottom: 12, letterSpacing: '0.02em',
                boxShadow: userLoaded && !loading ? '0 4px 20px rgba(245,158,11,0.4)' : 'none',
                transition: 'all .2s',
                animation: loading ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}>
              {!userLoaded ? 'Carregando...' : loading ? 'Redirecionando...' : 'Começar Premium — R$ 39,90/mês'}
            </button>

            {plano === 'pro' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '12px 16px', marginBottom: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                  Você é Pro — o Premium desbloqueia CSV, PDF e Assessor ilimitado.
                </span>
              </div>
            )}
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', margin: '0 0 28px' }}>
          Pague com cartão de crédito · Cancele quando quiser · Sem multa
        </p>

        {/* Garantia */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'flex-start', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🛡️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>Garantia de 7 dias</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>Não ficou satisfeito? Devolvemos 100% do valor sem perguntas nos primeiros 7 dias.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
