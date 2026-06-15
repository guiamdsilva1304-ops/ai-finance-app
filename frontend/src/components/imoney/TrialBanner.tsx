'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase'

export function TrialBanner() {
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (!token) return
      fetch('/api/trial-status', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.emTrial) setDiasRestantes(d.diasRestantes) })
        .catch(() => {})
    })
  }, [])

  if (diasRestantes === null) return null

  const texto = diasRestantes === 0
    ? 'Hoje é o último dia do seu acesso completo'
    : diasRestantes === 1
    ? 'Resta 1 dia do seu acesso completo'
    : `Restam ${diasRestantes} dias do seu acesso completo`

  return (
    <Link
      href="/dashboard/premium"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '7px 16px', textDecoration: 'none',
        background: 'linear-gradient(90deg, #0d1f0d 0%, #1a3a1a 50%, #0d1f0d 100%)',
        borderBottom: '1px solid rgba(0,200,83,0.2)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0 }}>✨</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#e8f0e8', fontFamily: 'Nunito, sans-serif', letterSpacing: 0.3 }}>
        {texto}
      </span>
      <span style={{ fontSize: 11, color: '#5a8a5a', fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#00C853', boxShadow: '0 0 4px #00C853' }} />
        Você está vivendo a iMoney completa: Assessor ilimitado, relatórios e mais
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#00C853', fontFamily: 'Nunito, sans-serif', letterSpacing: 0.3 }}>
        Invista no seu sonho →
      </span>
    </Link>
  )
}
