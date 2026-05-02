'use client'

import { useState } from 'react'

interface Cena {
  numero: number
  duracao: number
  camera: string
  tom: string
  texto: string
}

interface CardReels {
  dia: string
  formato: 'Reels'
  hook: string
  cenas: Cena[]
  dica_gravacao?: string
  legenda: string
  duracao_total: number
}

interface CardCarrossel {
  dia: string
  formato: 'Carrossel'
  titulo: string
  prompts_gemini: string[]
  legenda: string
}

interface CardPost {
  dia: string
  formato: 'Post'
  titulo: string
  prompt_gemini: string
  legenda: string
}

type Card = CardReels | CardCarrossel | CardPost

const TOM_COR: Record<string, string> = {
  surpreso: '#D85A30',
  animado: '#1D9E75',
  serio: '#378ADD',
  confidente: '#7F77DD',
}

const CAMERA_ICON: Record<string, string> = {
  frente: '🤳',
  tras: '📷',
}

function BotaoCopiar({ texto, label }: { texto: string; label?: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
      style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: 'none', background: copiado ? '#1D9E75' : '#e8ede8', color: copiado ? '#fff' : '#666', cursor: 'pointer', fontWeight: 600, transition: 'all .2s' }}>
      {copiado ? '✓ Copiado!' : (label ?? 'Copiar')}
    </button>
  )
}

function PromptGemini({ prompt, numero }: { prompt: string; numero?: number }) {
  return (
    <div style={{ background: '#f0f7ff', border: '1px solid #378ADD33', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#0C447C', background: '#E6F1FB', padding: '2px 8px', borderRadius: 10 }}>
            {numero !== undefined ? `SLIDE ${numero + 1}` : 'PROMPT'} · GEMINI
          </span>
          <span style={{ fontSize: 10, color: '#888' }}>Cole no ImageFX ou Gemini</span>
        </div>
        <BotaoCopiar texto={prompt} />
      </div>
      <div style={{ fontSize: 12, color: '#333', lineHeight: 1.6, fontFamily: 'monospace', background: '#fff', borderRadius: 6, padding: '8px 10px', border: '1px solid #e0e8f0' }}>
        {prompt}
      </div>
    </div>
  )
}

function CardReelsComp({ card }: { card: CardReels }) {
  const [exp, setExp] = useState(true)
  return (
    <div style={{ background: '#fff', border: '1px solid #534AB733', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ background: '#534AB710', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExp(!exp)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#534AB7', background: '#534AB722', padding: '3px 10px', borderRadius: 20 }}>Reels</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{card.dia}</span>
          <span style={{ fontSize: 11, color: '#888' }}>{card.duracao_total}s</span>
        </div>
        <span style={{ fontSize: 11, color: '#aaa' }}>{exp ? '▲ fechar' : '▼ ver roteiro'}</span>
      </div>
      {exp && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ background: '#1D9E7510', border: '1px solid #1D9E7530', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1D9E75', letterSpacing: '0.06em', marginBottom: 4 }}>HOOK — PRIMEIROS 3 SEGUNDOS</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.4 }}>{card.hook}</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', marginBottom: 8 }}>ROTEIRO CENA A CENA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {card.cenas.map(cena => (
              <div key={cena.numero} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#f8f9f8', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 44 }}>
                  <div style={{ fontSize: 18, lineHeight: 1 }}>{CAMERA_ICON[cena.camera] || '📱'}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{cena.duracao}s</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>CENA {cena.numero}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: TOM_COR[cena.tom] || '#888', background: (TOM_COR[cena.tom] || '#888') + '18', padding: '1px 6px', borderRadius: 10 }}>{cena.tom.toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: '#bbb' }}>{cena.camera === 'frente' ? 'câmera frontal' : 'câmera traseira'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.5 }}>{cena.texto}</div>
                </div>
              </div>
            ))}
          </div>
          {card.dica_gravacao && (
            <div style={{ background: '#EF9F2710', border: '1px solid #EF9F2730', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#EF9F27', letterSpacing: '0.06em', marginBottom: 4 }}>DICA DE GRAVAÇÃO</div>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>{card.dica_gravacao}</div>
            </div>
          )}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em' }}>LEGENDA + HASHTAGS</div>
              <BotaoCopiar texto={card.legenda} />
            </div>
            <div style={{ fontSize: 12, color: '#666', background: '#f8f9f8', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{card.legenda}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function CardCarrosselComp({ card }: { card: CardCarrossel }) {
  const [exp, setExp] = useState(false)
  const todosPrompts = card.prompts_gemini?.join('\n\n---\n\n') ?? ''
  return (
    <div style={{ background: '#fff', border: '1px solid #08504133', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ background: '#08504110', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExp(!exp)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#085041', background: '#08504122', padding: '3px 10px', borderRadius: 20 }}>Carrossel</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{card.dia}</span>
          <span style={{ fontSize: 11, color: '#888' }}>{card.prompts_gemini?.length ?? 0} slides</span>
        </div>
        <span style={{ fontSize: 11, color: '#aaa' }}>{exp ? '▲ fechar' : '▼ ver prompts'}</span>
      </div>
      {exp && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, borderLeft: '3px solid #085041', paddingLeft: 10 }}>{card.titulo}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#888' }}>Cole cada prompt no <strong>Google ImageFX</strong> ou <strong>Gemini</strong> para gerar o slide</div>
            <BotaoCopiar texto={todosPrompts} label="Copiar todos" />
          </div>
          {(card.prompts_gemini ?? []).map((prompt, i) => (
            <PromptGemini key={i} prompt={prompt} numero={i} />
          ))}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em' }}>LEGENDA + HASHTAGS</div>
              <BotaoCopiar texto={card.legenda} />
            </div>
            <div style={{ fontSize: 12, color: '#666', background: '#f8f9f8', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{card.legenda}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function CardPostComp({ card }: { card: CardPost }) {
  const [exp, setExp] = useState(false)
  return (
    <div style={{ background: '#fff', border: '1px solid #0C447C33', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ background: '#0C447C10', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExp(!exp)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0C447C', background: '#0C447C22', padding: '3px 10px', borderRadius: 20 }}>Post</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{card.dia}</span>
        </div>
        <span style={{ fontSize: 11, color: '#aaa' }}>{exp ? '▲ fechar' : '▼ ver prompt'}</span>
      </div>
      {exp && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 14, borderLeft: '3px solid #0C447C', paddingLeft: 10 }}>{card.titulo}</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>Cole este prompt no <strong>Google ImageFX</strong> ou <strong>Gemini</strong></div>
          <PromptGemini prompt={card.prompt_gemini} />
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em' }}>LEGENDA + HASHTAGS</div>
              <BotaoCopiar texto={card.legenda} />
            </div>
            <div style={{ fontSize: 12, color: '#666', background: '#f8f9f8', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{card.legenda}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConteudoCards({ cards }: { cards: Card[] }) {
  return (
    <div>
      {cards.map((card, i) => {
        if (card.formato === 'Reels') return <CardReelsComp key={i} card={card as CardReels} />
        if (card.formato === 'Carrossel') return <CardCarrosselComp key={i} card={card as CardCarrossel} />
        if (card.formato === 'Post') return <CardPostComp key={i} card={card as CardPost} />
        return null
      })}
    </div>
  )
}
