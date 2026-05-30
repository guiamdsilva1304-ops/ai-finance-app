'use client'

import { useState, useRef } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'

interface VoiceResult {
  tipo: 'gasto' | 'receita'
  valor: number
  descricao: string
  categoria: string
  confianca: number
  erro?: string
}

export default function VoiceTransactionButton({ onSuccess }: { onSuccess: () => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'confirm' | 'saving'>('idle')
  const [result, setResult] = useState<VoiceResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setError('Use o Chrome para reconhecimento de voz.')
      return
    }

    const recognition = new SR()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onstart = () => setState('recording')

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      setState('processing')

      try {
        const res = await fetch('/api/voice-transaction', {
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
        setError('Erro ao processar. Tente novamente.')
        setState('idle')
      }
    }

    recognition.onerror = () => {
      setError('Erro ao gravar. Tente novamente.')
      setState('idle')
    }

    recognition.start()
  }

  const stopRecording = () => recognitionRef.current?.stop()

  const handleConfirm = async () => {
    if (!result) return
    setState('saving')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('transactions').insert({
      user_id: user.id,
      tipo: result.tipo,
      valor: result.valor,
      descricao: result.descricao,
      categoria: result.categoria,
      date: new Date().toISOString().split('T')[0],
      source: 'voice',
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
      {/* Botão flutuante mic */}
      <button
        onClick={state === 'recording' ? stopRecording : startRecording}
        disabled={state === 'processing' || state === 'saving'}
        title="Adicionar transação por voz"
        className={`fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          state === 'recording'
            ? 'bg-red-500 animate-pulse'
            : 'bg-[#00C853] hover:bg-[#00a844]'
        } disabled:opacity-50`}
      >
        {state === 'processing' || state === 'saving' ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : state === 'recording' ? (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
          </svg>
        )}
      </button>

      {/* Label de gravando */}
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

      {/* Modal de confirmação */}
      {(state === 'confirm' || state === 'saving') && result && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Confirmar transação</h3>
            <p className="text-xs text-gray-400 mb-4 italic">"{transcript}"</p>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                <span className="text-sm text-gray-500">Tipo</span>
                <span className={`font-semibold text-sm px-3 py-1 rounded-full ${
                  result.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {result.tipo === 'receita' ? '↑ Receita' : '↓ Gasto'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                <span className="text-sm text-gray-500">Valor</span>
                <span className="font-bold text-gray-800 text-lg">
                  R$ {result.valor.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                <span className="text-sm text-gray-500">Descrição</span>
                <span className="font-medium text-gray-800 text-sm">{result.descricao}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                <span className="text-sm text-gray-500">Categoria</span>
                <span className="font-medium text-gray-800 text-sm">{result.categoria}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={state === 'saving'}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={state === 'saving'}
                className="flex-1 py-3 rounded-xl bg-[#00C853] text-white font-semibold"
              >
                {state === 'saving' ? 'Salvando...' : 'Confirmar ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
