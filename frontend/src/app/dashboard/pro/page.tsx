'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FEATURES_FREE = [
  'Dashboard financeiro completo',
  'Controle de transações',
  'Metas financeiras (até 3)',
  'Taxas SELIC e IPCA em tempo real',
]

const FEATURES_PRO = [
  'Tudo do plano gratuito',
  'Assessor IA ilimitado',
  'Metas financeiras ilimitadas',
  'Controle de investimentos',
  'Análise de renda e gastos',
  'Relatórios mensais automáticos',
  'Histórico completo',
  'Prioridade no suporte',
]

export default function ProPage() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [plano, setPlano] = useState<string>('free')
  const [periodo, setPeriodo] = useState<'mensal' | 'anual'>('mensal')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ id: user.id, email: user.email! })
        const { data } = await supabase
          .from('user_profiles')
          .select('plan')
          .eq('id', user.id)
          .single()
        if (data?.plan) setPlano(data.plan)
      }
    }
    load()
  }, [])

  async function assinar() {
    if (!user) { window.location.href = '/login'; return }
    setLoading(true)
    try {
      const res = await fetch('/api/payment/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, email: user.email, periodo }),
      })
      const data = await res.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        alert('Erro ao iniciar assinatura. Tente novamente.')
      }
    } catch {
      alert('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const preco = periodo === 'mensal' ? 29.90 : 23.90
  const precoAnual = (preco * 12).toFixed(2)
  const economia = periodo === 'anual' ? Math.round((1 - preco / 29.90) * 100) : 0

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9f8',
      fontFamily: "'Nunito', sans-serif",
      padding: '0 0 80px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a3d28 0%, #1D9E75 100%)',
        padding: '60px 20px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Círculos decorativos */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)', borderRadius: 20,
            padding: '6px 16px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#E1F5EE', letterSpacing: '0.05em' }}>iMoney Pro</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 900, color: '#fff',
            margin: '0 0 16px', lineHeight: 1.15,
          }}>
            Sua bússola financeira<br />
            <span style={{ color: '#9FE1CB' }}>completa com IA</span>
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', margin: '0 auto', maxWidth: 480, lineHeight: 1.6 }}>
            O Assessor IA ilimitado que entende sua situação financeira e te ajuda a tomar decisões melhores todo dia.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>

        {/* Toggle mensal/anual */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: 6,
          display: 'flex', gap: 4, marginTop: -24, marginBottom: 28,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          {(['mensal', 'anual'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                transition: 'all .2s',
                background: periodo === p ? '#1D9E75' : 'transparent',
                color: periodo === p ? '#fff' : '#888',
              }}>
              {p === 'mensal' ? 'Mensal' : 'Anual'}
              {p === 'anual' && (
                <span style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 700,
                  background: periodo === 'anual' ? 'rgba(255,255,255,0.25)' : '#E1F5EE',
                  color: periodo === 'anual' ? '#fff' : '#085041',
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  -20%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Card de preço */}
        <div style={{
          background: '#fff', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 4px 32px rgba(29,158,117,0.12)',
          border: '2px solid #1D9E75',
          marginBottom: 20,
        }}>
          <div style={{ background: '#1D9E75', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>R$</span>
              <span style={{ fontSize: 56, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {preco.toFixed(2).replace('.', ',')}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>/mês</span>
            </div>
            {periodo === 'anual' && (
              <div style={{ fontSize: 13, color: '#9FE1CB', marginTop: 4 }}>
                R$ {precoAnual.replace('.', ',')} cobrado anualmente · você economiza R$ {(6 * 12).toFixed(0)}/ano
              </div>
            )}
          </div>

          <div style={{ padding: '24px 28px' }}>
            {FEATURES_PRO.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#E1F5EE', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 900 }}>✓</span>
                </div>
                <span style={{ fontSize: 14, color: '#1a1a1a', fontWeight: i < 1 ? 600 : 400 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Botão de assinar */}
        {plano === 'pro' ? (
          <div style={{
            background: '#E1F5EE', borderRadius: 16, padding: '20px 28px',
            textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ fontSize: 22 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#085041', marginTop: 8 }}>Você já é Pro!</div>
            <div style={{ fontSize: 13, color: '#1D9E75', marginTop: 4 }}>Aproveite todos os recursos ilimitados.</div>
          </div>
        ) : (
          <button onClick={assinar} disabled={loading} style={{
            width: '100%', padding: '18px 0',
            background: loading ? '#ccc' : 'linear-gradient(135deg, #0a3d28 0%, #1D9E75 100%)',
            color: '#fff', border: 'none', borderRadius: 16,
            fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 12, letterSpacing: '0.02em',
            boxShadow: '0 4px 20px rgba(29,158,117,0.35)',
            transition: 'all .2s',
            animation: loading ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}>
            {loading ? 'Redirecionando...' : `Assinar iMoney Pro — R$ ${preco.toFixed(2).replace('.', ',')}/mês`}
          </button>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', margin: '0 0 28px' }}>
          Pague com cartão de crédito · Cancele quando quiser · Sem multa
        </p>

        {/* Plano gratuito comparativo */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '24px 28px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 28,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#aaa', letterSpacing: '0.05em', marginBottom: 16 }}>PLANO GRATUITO (atual)</div>
          {FEATURES_FREE.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: '#f0f0f0', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, color: '#aaa', fontWeight: 900 }}>✓</span>
              </div>
              <span style={{ fontSize: 14, color: '#666' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Garantia */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px 24px',
          display: 'flex', gap: 16, alignItems: 'flex-start',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🛡️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>Garantia de 7 dias</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
              Não ficou satisfeito? Devolvemos 100% do valor sem perguntas nos primeiros 7 dias.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
