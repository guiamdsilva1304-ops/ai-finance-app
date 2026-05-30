'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'

const FEATURES_FREE = [
  'Dashboard financeiro completo',
  'Controle de transações',
  'Metas financeiras ilimitadas',
  'Taxas SELIC e IPCA em tempo real',
  'Assessor IA · 3 msgs/dia (respostas gerais)',
]

const FEATURES_PRO = [
  'Tudo do plano gratuito',
  'Assessor IA · 10 msgs/dia (análise completa dos seus dados)',
  '🎤 Voz no Assessor — fale sua pergunta',
  '🎤 Adicionar transações por voz',
  'Controle de investimentos',
  'Análise de renda e gastos',
  'Relatórios mensais automáticos',
  'Histórico completo',
  'Suporte prioritário',
]

const FEATURES_PREMIUM = [
  'Tudo do plano Pro',
  'Assessor IA ilimitado · 24h',
  'Exportação de dados em CSV',
  'Relatório mensal em PDF',
  'Histórico completo ilimitado',
  'Suporte VIP',
]

export default function ProPage() {
  const supabase = createSupabaseBrowser()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [plano, setPlano] = useState<string>('free')
  const [periodo, setPeriodo] = useState<'mensal' | 'anual'>('mensal')

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
        console.error('[Pro] Erro ao carregar usuario:', e)
      } finally {
        setUserLoaded(true)
      }
    }
    load()
  }, [])

  async function assinarPro() {
    if (!userId || !userEmail) { window.location.href = '/login'; return }
    setLoading(true)
    try {
      const res = await fetch('/api/payment/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email: userEmail, periodo }),
      })
      const data = await res.json()
      if (data.checkout_url) window.open(data.checkout_url, '_blank')
      else alert('Erro: ' + (data.error ?? 'Tente novamente.'))
    } catch {
      alert('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const precoPro = periodo === 'mensal' ? 29.90 : 23.90

  const Check = ({ dark }: { dark?: boolean }) => (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
      background: dark ? 'rgba(255,255,255,0.2)' : '#E1F5EE',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 11, fontWeight: 900, color: dark ? '#fff' : '#1D9E75' }}>✓</span>
    </div>
  )

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: '#f8f9f8', fontFamily: "'Nunito', sans-serif", padding: '0 0 80px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
        .plans-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        @media (max-width: 900px) { .plans-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a3d28 0%, #1D9E75 100%)', padding: '40px 24px 56px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.15 }}>
          Escolha o plano certo para você
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', margin: '0 auto', maxWidth: 480, lineHeight: 1.6 }}>
          Comece grátis e faça upgrade quando quiser — sem burocracia.
        </p>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>

        {/* Toggle mensal/anual */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 5, display: 'flex', gap: 4, marginTop: -24, marginBottom: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', position: 'relative', zIndex: 10, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          {(['mensal', 'anual'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s', background: periodo === p ? '#1D9E75' : 'transparent', color: periodo === p ? '#fff' : '#888' }}>
              {p === 'mensal' ? 'Mensal' : 'Anual'}
              {p === 'anual' && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: periodo === 'anual' ? 'rgba(255,255,255,0.25)' : '#E1F5EE', color: periodo === 'anual' ? '#fff' : '#085041', padding: '2px 7px', borderRadius: 20 }}>-20%</span>}
            </button>
          ))}
        </div>

        {/* 3 colunas */}
        <div className="plans-grid">

          {/* ── Free ── */}
          <div style={{ background: '#fff', border: '1.5px solid #e8ede8', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Gratuito</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>Comece grátis</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 6 }}>R$</span>
              <span style={{ fontSize: 44, fontWeight: 900, color: '#1a1a1a', lineHeight: 1 }}>0</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 6 }}>/mês</span>
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 24 }}>para sempre</div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES_FREE.map(f => (
                <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, color: '#444' }}>
                  <Check /> {f}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 28 }}>
              {plano === 'free' ? (
                <div style={{ textAlign: 'center', padding: '12px 0', borderRadius: 12, background: '#f0f0f0', fontSize: 13, fontWeight: 700, color: '#888' }}>
                  Plano atual
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0', borderRadius: 12, border: '1.5px solid #e8ede8', fontSize: 13, fontWeight: 700, color: '#aaa' }}>
                  Incluído no seu plano
                </div>
              )}
            </div>
          </div>

          {/* ── Pro ── */}
          <div style={{ background: 'linear-gradient(180deg, #0a3d28 0%, #1D9E75 100%)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(29,158,117,0.30)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 16, right: 16, background: '#00c853', color: '#0a3d28', padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em' }}>MAIS POPULAR</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>✨ Pro</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Invista no seu sonho</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>R$</span>
              <span style={{ fontSize: 44, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{precoPro.toFixed(2).replace('.', ',')}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>/mês</span>
            </div>
            {periodo === 'anual'
              ? <div style={{ fontSize: 12, color: '#9FE1CB', marginBottom: 24 }}>R$ {(precoPro * 12).toFixed(2).replace('.', ',')} cobrado anualmente · economize R$ 72/ano</div>
              : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>menos de R$1/dia</div>
            }

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES_PRO.map(f => (
                <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, color: '#fff' }}>
                  <Check dark /> {f}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 28 }}>
              {plano === 'pro' ? (
                <div style={{ textAlign: 'center', padding: '14px 0', borderRadius: 12, background: 'rgba(255,255,255,0.15)', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  🎉 Plano atual
                </div>
              ) : plano === 'premium' ? (
                <div style={{ textAlign: 'center', padding: '14px 0', borderRadius: 12, background: 'rgba(255,255,255,0.1)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                  Incluído no Premium
                </div>
              ) : (
                <button onClick={assinarPro} disabled={loading || !userLoaded}
                  style={{ width: '100%', padding: '14px 0', background: loading || !userLoaded ? 'rgba(255,255,255,0.3)' : '#fff', color: loading || !userLoaded ? 'rgba(255,255,255,0.5)' : '#0a3d28', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: loading || !userLoaded ? 'not-allowed' : 'pointer', transition: 'all .2s', animation: loading ? 'pulse 1.5s ease-in-out infinite' : 'none' }}>
                  {!userLoaded ? 'Carregando...' : loading ? 'Redirecionando...' : `Assinar Pro — R$ ${precoPro.toFixed(2).replace('.', ',')}/mês`}
                </button>
              )}
            </div>
          </div>

          {/* ── Premium ── */}
          <div style={{ background: 'linear-gradient(180deg, #78350f 0%, #F59E0B 100%)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(245,158,11,0.25)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>⭐ Premium</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Controle total</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>R$</span>
              <span style={{ fontSize: 44, fontWeight: 900, color: '#fff', lineHeight: 1 }}>59,90</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>/mês</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>menos de R$2/dia</div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES_PREMIUM.map(f => (
                <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, color: '#fff' }}>
                  <Check dark /> {f}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 28 }}>
              {plano === 'premium' ? (
                <div style={{ textAlign: 'center', padding: '14px 0', borderRadius: 12, background: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  ⭐ Plano atual
                </div>
              ) : (
                <a href="/dashboard/premium"
                  style={{ display: 'block', textAlign: 'center', padding: '14px 0', background: '#fff', color: '#78350f', borderRadius: 12, fontSize: 15, fontWeight: 800, textDecoration: 'none', transition: 'all .2s' }}>
                  Começar Premium →
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Garantia */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 22px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginTop: 24 }}>
          <div style={{ fontSize: 26, flexShrink: 0 }}>🛡️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Garantia de 7 dias</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5, marginTop: 2 }}>Não ficou satisfeito? Devolvemos 100% do valor sem perguntas nos primeiros 7 dias.</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa', textAlign: 'right', flexShrink: 0 }}>
            Cartão de crédito<br />Cancele quando quiser
          </div>
        </div>

      </div>
    </div>
  )
}
