'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { X } from 'lucide-react'

const NPS_STORAGE_KEY = 'imoney_nps_last_shown'
const NPS_INTERVAL_DAYS = 7
const NPS_MIN_AGE_DAYS = 7

export function NPSToast() {
  const [visible, setVisible] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    checkShouldShow()
  }, [])

  async function checkShouldShow() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Checa idade da conta (mínimo 7 dias)
      const createdAt = new Date(user.created_at)
      const diasDeCadastro = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (diasDeCadastro < NPS_MIN_AGE_DAYS) return

      // Checa última vez que foi exibido (localStorage)
      const lastShown = localStorage.getItem(NPS_STORAGE_KEY)
      if (lastShown) {
        const diasDesdeUltimaExibicao = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24)
        if (diasDesdeUltimaExibicao < NPS_INTERVAL_DAYS) return
      }

      // Aparece após 3s para não assustar
      setTimeout(() => {
        setVisible(true)
        localStorage.setItem(NPS_STORAGE_KEY, Date.now().toString())
      }, 3000)
    } catch {
      // silencia erros
    }
  }

  async function handleEnviar() {
    if (score === null) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('nps_responses').insert({ user_id: user.id, score })
      setEnviado(true)
      setTimeout(() => setVisible(false), 2000)
    } catch {
      setVisible(false)
    } finally {
      setLoading(false)
    }
  }

  function handleDismiss() {
    setVisible(false)
  }

  if (!visible) return null

  const getScoreColor = (s: number) => {
    if (s <= 6) return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' }
    if (s <= 8) return { bg: '#fef9c3', text: '#ca8a04', border: '#fde047' }
    return { bg: '#dcfce7', text: '#16a34a', border: '#86efac' }
  }

  return (
    <div
      className="fixed top-5 right-5 z-50 w-80 shadow-2xl rounded-2xl overflow-hidden"
      style={{
        background: '#fff',
        border: '1px solid #e4f5e9',
        animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-base">⭐</span>
            <p className="font-black text-[#0d2414] text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Avalie a iMoney
            </p>
          </div>
          <p className="text-xs text-[#6b9e80] leading-snug">
            De 0 a 10, qual a chance de recomendar para um amigo?
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
        >
          <X size={15} className="text-gray-400" />
        </button>
      </div>

      {!enviado ? (
        <>
          {/* Scores */}
          <div className="px-4 pb-3">
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => {
                const colors = getScoreColor(i)
                const selected = score === i
                return (
                  <button
                    key={i}
                    onClick={() => setScore(i)}
                    className="w-[26px] h-[26px] rounded-lg text-xs font-black transition-all border"
                    style={{
                      background: selected ? colors.bg : '#f8fdf9',
                      color: selected ? colors.text : '#8db89d',
                      borderColor: selected ? colors.border : '#e4f5e9',
                      transform: selected ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    {i}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">Pouco provável</span>
              <span className="text-[10px] text-gray-400">Muito provável</span>
            </div>
          </div>

          {/* Botão */}
          <div className="px-4 pb-4">
            <button
              onClick={handleEnviar}
              disabled={score === null || loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: score !== null ? '#1D9E75' : '#e4f5e9',
                color: score !== null ? '#fff' : '#8db89d',
                cursor: score !== null ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Enviando...' : 'Enviar avaliação'}
            </button>
          </div>
        </>
      ) : (
        <div className="px-4 pb-5 text-center">
          <p className="text-2xl mb-1">🙏</p>
          <p className="font-black text-[#0d2414] text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Obrigado pelo feedback!
          </p>
          <p className="text-xs text-[#6b9e80] mt-0.5">Isso nos ajuda a melhorar a iMoney.</p>
        </div>
      )}
    </div>
  )
}
