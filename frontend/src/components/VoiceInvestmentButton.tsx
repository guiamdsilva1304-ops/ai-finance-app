'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'

interface VoiceInvestmentResult {
  nome: string
  tipo: string
  valor: number
  moeda: string
  corretora: string | null
  notas: string | null
  confianca: number
  erro?: string
}

const PAIS_POR_TIPO: Record<string, string> = {
  'Ações EUA': 'Estados Unidos',
  'Ações Europa': 'Europa',
  'ETF': 'Estados Unidos',
}

const ERROS: Record<string, string> = {
  'not-allowed': 'Permissão de microfone negada. Libere nas configurações do Chrome.',
  'no-speech': 'Nenhuma fala detectada. Tente novamente.',
  'network': 'Erro de rede. Verifique sua conexão.',
  'audio-capture': 'Microfone não encontrado.',
  'aborted': 'Gravação cancelada.',
}

const TIPO_EMOJI: Record<string, string> = {
  'Ações BR (B3)': '🇧🇷',
  'Ações EUA': '🇺🇸',
  'Ações Europa': '🇪🇺',
  'FIIs': '🏢',
  'ETF': '📊',
  'Tesouro Direto': '🏛️',
  'CDB/LCI/LCA': '🏦',
  'Criptomoedas': '₿',
  'Fundos': '💼',
  'Outro': '📈',
}

interface Props {
  onSuccess: () => void
  isPro: boolean
}

export default function VoiceInvestmentButton({ onSuccess, isPro }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'confirm' | 'saving'>('idle')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [result, setResult] = useState<VoiceInvestmentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const gotResultRef = useRef(false)

  const handleFabClick = () => {
    if (!isPro) {
      setShowUpgrade(true)
      return
    }
    if (state === 'recording') {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setError('Use o Chrome para reconhecimento de voz.')
      return
    }

    gotResultRef.current = false
    const recognition = new SR()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onstart = () => setState('recording')

    recognition.onresult = async (event: any) => {
      gotResultRef.current = true
      const text = event.results[0][0].transcript
      setTranscript(text)
      setState('processing')

      try {
        const res = await fetch('/api/voice-investment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text }),
        })
        const data = await res.json()
        if (data.erro) {
          setError(data.erro)
          setState('idle')
        } else {
          setResult(data)
          setState('confirm')
        }
      } catch {
        setError('Algo deu errado — tente em instantes.')
        setState('idle')
      }
    }

    recognition.onerror = (event: any) => {
      const msg = ERROS[event.error] ?? `Erro: ${event.error}`
      setError(msg)
      setState('idle')
    }

    recognition.onend = () => {
      if (!gotResultRef.current) setState('idle')
    }

    recognition.start()
  }

  const stopRecording = () => recognitionRef.current?.stop()

  const handleConfirm = async () => {
    if (!result) return
    setState('saving')

    const supabase = createSupabaseBrowser()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const pais = PAIS_POR_TIPO[result.tipo] ?? 'Brasil'

    await supabase.from('user_investments').insert({
      user_id: user.id,
      nome: result.nome.trim().slice(0, 100),
      tipo: result.tipo,
      valor_original: result.valor,
      moeda: result.moeda || 'BRL',
      valor_brl: result.moeda === 'BRL' ? result.valor : null,
      pais,
      corretora: result.corretora ?? null,
      notas: result.notas ?? null,
      updated_at: new Date().toISOString(),
    })

    setResult(null)
    setState('idle')
    onSuccess()
  }

  const handleCancel = () => {
    setResult(null)
    setState('idle')
    setError(null)
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={handleFabClick}
        disabled={state === 'processing' || state === 'saving'}
        title={isPro ? 'Adicionar investimento por voz' : 'Recurso exclusivo Pro'}
        className={`fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          state === 'recording'
            ? 'bg-red-500 animate-pulse'
            : isPro
            ? 'bg-[#1a3a1a] hover:bg-[#00C853]'
            : 'bg-[#1a3a1a] hover:bg-[#2a5a2a]'
        } disabled:opacity-50`}
      >
        {state === 'processing' || state === 'saving' ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : state === 'recording' ? (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <div className="relative flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
            {!isPro && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-[#0d2414] text-[8px] font-black px-1 rounded-full leading-4">
                PRO
              </span>
            )}
          </div>
        )}
      </button>

      {/* Tooltip recording */}
      {state === 'recording' && (
        <div className="fixed bottom-40 right-6 z-50 bg-gray-800 text-white text-xs px-3 py-2 rounded-full shadow">
          🎙 Ouvindo... toque para parar
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-40 right-6 z-50 bg-red-500 text-white text-sm px-4 py-2 rounded-xl shadow-lg max-w-xs flex items-center gap-2">
          {error}
          <button onClick={() => setError(null)} className="font-bold ml-1">✕</button>
        </div>
      )}

      {/* Upgrade modal (free users) */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🎙️</div>
              <h3 className="font-black text-gray-800 text-xl mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Adicionar por voz
              </h3>
              <p className="text-sm text-gray-500">
                Registre seus investimentos em segundos — só fale o ativo, o valor e a corretora.
              </p>
            </div>
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 mb-5 space-y-2">
              {[
                '"Comprei 500 reais de PETR4 na XP"',
                '"Tesouro Selic, mil reais"',
                '"XPLG11, duzentos reais, Rico"',
              ].map(ex => (
                <p key={ex} className="text-xs text-[#16a34a] font-medium italic">{ex}</p>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgrade(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm"
              >
                Agora não
              </button>
              <button
                onClick={() => router.push('/dashboard/pro')}
                className="flex-1 py-3 rounded-xl bg-[#00C853] text-white font-black text-sm"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                Assinar Pro ✦
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal (pro users) */}
      {(state === 'confirm' || state === 'saving') && result && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Confirmar investimento</h3>
            <p className="text-xs text-gray-400 mb-4 italic">"{transcript}"</p>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                <span className="text-sm text-gray-500">Ativo</span>
                <span className="font-bold text-gray-800">{result.nome}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                <span className="text-sm text-gray-500">Tipo</span>
                <span className="font-semibold text-sm px-3 py-1 rounded-full bg-green-100 text-green-700">
                  {TIPO_EMOJI[result.tipo] ?? '📈'} {result.tipo}
                </span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                <span className="text-sm text-gray-500">Valor</span>
                <span className="font-bold text-gray-800 text-lg">
                  R$ {result.valor.toFixed(2).replace('.', ',')}
                </span>
              </div>
              {result.corretora && (
                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                  <span className="text-sm text-gray-500">Corretora</span>
                  <span className="font-medium text-gray-800 text-sm">{result.corretora}</span>
                </div>
              )}
              {result.notas && (
                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                  <span className="text-sm text-gray-500">Notas</span>
                  <span className="font-medium text-gray-800 text-sm">{result.notas}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleCancel} disabled={state === 'saving'}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">
                Cancelar
              </button>
              <button onClick={handleConfirm} disabled={state === 'saving'}
                className="flex-1 py-3 rounded-xl bg-[#00C853] text-white font-semibold">
                {state === 'saving' ? 'Salvando...' : 'Confirmar ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
