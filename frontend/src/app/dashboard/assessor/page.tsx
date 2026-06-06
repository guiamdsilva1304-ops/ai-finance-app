"use client";
import { amplitude } from "@/app/amplitude";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Trash2, X, ChevronRight, User, Target, TrendingUp, MapPin, Briefcase, Heart, Brain, Mic, MicOff } from "lucide-react";
import { Icon } from "@/components/imoney/primitives";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PlanFase {
  numero: number;
  titulo: string;
  duracao: string;
  descricao: string;
  acoes: string[];
  meta_parcial?: string;
}

interface PlanData {
  meta: string;
  prazo_total: string;
  valor_alvo?: number;
  fases: PlanFase[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  plan?: PlanData;
}

interface UserContext {
  renda: number;
  gastos: number;
  metas: Array<{ nome: string; valor_alvo: number; valor_atual: number; prazo?: string }>;
  perfil: Record<string, unknown>;
  mem: Record<string, unknown>;
}

// ─── Parser de plano ─────────────────────────────────────────────────────────

function parsePlan(raw: string): { text: string; plan: PlanData | null } {
  const match = raw.match(/```plano\n?([\s\S]*?)```/)
  if (!match) return { text: raw, plan: null }
  const text = raw.slice(0, raw.indexOf("```plano")).trim()
  try {
    const plan = JSON.parse(match[1].trim()) as PlanData
    if (!plan.fases || !Array.isArray(plan.fases)) return { text: raw, plan: null }
    return { text, plan }
  } catch {
    return { text: raw, plan: null }
  }
}

// ─── Cores por fase ──────────────────────────────────────────────────────────

const FASE_CORES = [
  { bg: '#E1F5EE', border: '#1D9E75', badge: '#1D9E75', text: '#085041' },
  { bg: '#EBF4FF', border: '#378ADD', badge: '#378ADD', text: '#0C447C' },
  { bg: '#F0EFFF', border: '#7F77DD', badge: '#7F77DD', text: '#3A359A' },
  { bg: '#FFF8EC', border: '#EF9F27', badge: '#EF9F27', text: '#633806' },
  { bg: '#FFEDE8', border: '#D85A30', badge: '#D85A30', text: '#7A2C15' },
]

// ─── Componente de cards do plano ────────────────────────────────────────────

function PlanCards({ plan }: { plan: PlanData }) {
  const [expandido, setExpandido] = useState<number | null>(0)

  return (
    <div style={{ marginTop: 4, width: '100%' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0a3d28 0%, #1D9E75 100%)',
        borderRadius: '16px 16px 0 0',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>
            Plano para conquistar
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
            {plan.meta}
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: 12,
          padding: '6px 12px', textAlign: 'center', flexShrink: 0,
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{plan.fases.length}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>FASES</div>
        </div>
      </div>

      <div style={{ background: '#0a3d28', padding: '8px 18px', display: 'flex', gap: 4 }}>
        {plan.fases.map((_, i) => {
          const cor = FASE_CORES[i % FASE_CORES.length]
          return (
            <div key={i} onClick={() => setExpandido(expandido === i ? null : i)}
              style={{ flex: 1, height: 4, borderRadius: 2, background: cor.badge, opacity: expandido === i ? 1 : 0.4, cursor: 'pointer', transition: 'opacity .2s' }} />
          )
        })}
      </div>

      <div style={{ background: '#f8fdf9', borderRadius: '0 0 16px 16px', overflow: 'hidden', border: '1px solid #e4f5e9', borderTop: 'none' }}>
        {plan.fases.map((fase, i) => {
          const cor = FASE_CORES[i % FASE_CORES.length]
          const aberta = expandido === i

          return (
            <div key={i} style={{ borderBottom: i < plan.fases.length - 1 ? '1px solid #e4f5e9' : 'none' }}>
              <button
                onClick={() => setExpandido(aberta ? null : i)}
                style={{
                  width: '100%', background: aberta ? cor.bg : '#fff',
                  border: 'none', cursor: 'pointer',
                  padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
                  textAlign: 'left', transition: 'background .15s',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: aberta ? cor.badge : '#e4f5e9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900,
                  color: aberta ? '#fff' : '#6b9e80',
                  flexShrink: 0, transition: 'all .15s',
                }}>
                  {fase.numero}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: aberta ? cor.text : '#1a3a1a', lineHeight: 1.2, marginBottom: 2 }}>
                    {fase.titulo}
                  </div>
                  <div style={{ fontSize: 11, color: '#8db89d', fontWeight: 600 }}>
                    {fase.duracao}
                  </div>
                </div>
                {fase.meta_parcial && !aberta && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: cor.text,
                    background: cor.bg, border: `1px solid ${cor.border}33`,
                    padding: '3px 8px', borderRadius: 20,
                    whiteSpace: 'nowrap', flexShrink: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: '45%',
                  }}>
                    {fase.meta_parcial}
                  </div>
                )}
                <div style={{ color: '#aaa', fontSize: 12, flexShrink: 0 }}>{aberta ? '▲' : '▼'}</div>
              </button>

              {aberta && (
                <div style={{ padding: '0 18px 18px 18px' }}>
                  <p style={{ fontSize: 13, color: '#4a6860', lineHeight: 1.65, margin: '0 0 14px 0' }}>
                    {fase.descricao}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fase.acoes.map((acao, ai) => (
                      <div key={ai} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        background: '#fff', border: `1px solid ${cor.border}22`,
                        borderRadius: 10, padding: '10px 12px',
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: cor.bg, border: `1.5px solid ${cor.badge}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, marginTop: 1,
                        }}>
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke={cor.badge} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: 13, color: '#1a3a1a', lineHeight: 1.5, fontWeight: 500 }}>{acao}</span>
                      </div>
                    ))}
                  </div>
                  {fase.meta_parcial && (
                    <div style={{
                      marginTop: 14, background: cor.bg,
                      border: `1px solid ${cor.border}44`,
                      borderRadius: 10, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 18 }}>🎯</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: cor.text, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 1 }}>Marco da fase</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cor.text }}>{fase.meta_parcial}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', padding: '10px 0 2px', fontSize: 11, color: '#8db89d' }}>
        Toque em cada fase para ver os detalhes
      </div>
    </div>
  )
}

// ─── Conversation starters contextuais ───────────────────────────────────────

function buildContextualStarters(ctx: UserContext | null): Array<{ label: string; prompt: string }> {
  const starters: Array<{ label: string; prompt: string }> = []

  if (!ctx) {
    return [
      { label: "📊 Onde investir minha sobra?", prompt: "Analise minha situação financeira e me diga onde devo investir minha sobra mensal considerando a SELIC atual e meu perfil." },
      { label: "🎯 Como alcançar minhas metas?", prompt: "Com base no meu perfil e situação atual, me faz um plano detalhado para alcançar minha principal meta." },
      { label: "✂️ Como cortar gastos?", prompt: "Analise meus gastos por categoria e me diga onde posso reduzir de forma inteligente." },
      { label: "🛡️ Reserva de emergência", prompt: "Como devo montar minha reserva de emergência? Quanto preciso guardar e onde?" },
    ]
  }

  const sobra = ctx.renda - ctx.gastos
  const metaPrincipal = ctx.metas?.[0]

  if (sobra > 0) {
    starters.push({
      label: `💰 Investir R$${Math.round(sobra).toLocaleString('pt-BR')}/mês`,
      prompt: `Tenho uma sobra de R$${Math.round(sobra).toLocaleString('pt-BR')} por mês. Considerando a SELIC atual e meu perfil, qual é a melhor forma de investir esse valor?`,
    })
  } else if (sobra < 0) {
    starters.push({
      label: "🚨 Estou no vermelho, e agora?",
      prompt: `Meus gastos estão R$${Math.abs(Math.round(sobra)).toLocaleString('pt-BR')} acima da minha renda. Me ajuda com um plano de ação para equilibrar minhas finanças.`,
    })
  }

  if (metaPrincipal) {
    const pct = metaPrincipal.valor_alvo > 0
      ? Math.round((metaPrincipal.valor_atual / metaPrincipal.valor_alvo) * 100)
      : 0
    const falta = metaPrincipal.valor_alvo - metaPrincipal.valor_atual
    starters.push({
      label: `🎯 ${metaPrincipal.nome} (${pct}%)`,
      prompt: `Já acumulei ${pct}% da minha meta "${metaPrincipal.nome}". Ainda faltam R$${Math.round(falta).toLocaleString('pt-BR')}. Como posso acelerar para chegar lá mais rápido?`,
    })
  }

  const reservaIdeal = ctx.renda * 6
  starters.push({
    label: "🛡️ Quanto guardar de reserva?",
    prompt: `Com minha renda atual, quanto preciso ter de reserva de emergência? Onde é melhor guardar esse dinheiro?`,
  })

  if (ctx.renda > 0) {
    starters.push({
      label: "✂️ Onde posso cortar gastos?",
      prompt: "Analisa meus gastos por categoria e me mostra onde posso economizar de forma inteligente sem prejudicar minha qualidade de vida.",
    })
  }

  return starters.slice(0, 4)
}

// ─── Sidebar de memória ───────────────────────────────────────────────────────

function MemorySidebar({
  open,
  onClose,
  perfil,
  mem,
  metas,
}: {
  open: boolean
  onClose: () => void
  perfil: Record<string, unknown>
  mem: Record<string, unknown>
  metas: Array<{ nome: string; valor_alvo: number; valor_atual: number }>
}) {
  const primeiroNome =
    (perfil.nome_preferido as string) ||
    ((perfil.nome as string) || "Você").split(" ")[0]
  const nome = primeiroNome

  const items: Array<{ icon: React.ReactNode; label: string; value: string }> = []

  if (perfil.ocupacao) items.push({ icon: <Briefcase size={13}/>, label: "Profissão", value: perfil.ocupacao as string })
  if (perfil.cidade) items.push({ icon: <MapPin size={13}/>, label: "Cidade", value: `${perfil.cidade}${perfil.estado ? `, ${perfil.estado}` : ''}` })
  if (perfil.idade) items.push({ icon: <User size={13}/>, label: "Idade", value: `${perfil.idade} anos` })
  if (perfil.filhos !== undefined && perfil.filhos !== null) items.push({ icon: <Heart size={13}/>, label: "Filhos", value: String(perfil.filhos) })

  if (mem.sonho_principal) items.push({ icon: <span style={{ fontSize: 13 }}>✨</span>, label: "Sonho principal", value: mem.sonho_principal as string })
  if (mem.perfil_risco) items.push({ icon: <TrendingUp size={13}/>, label: "Perfil de risco", value: mem.perfil_risco as string })
  if (mem.objetivo_financeiro) items.push({ icon: <Target size={13}/>, label: "Objetivo", value: mem.objetivo_financeiro as string })
  if (mem.ultima_preocupacao) items.push({ icon: <Brain size={13}/>, label: "Última preocupação", value: mem.ultima_preocupacao as string })

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          zIndex: 40, opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 320, background: '#fff',
        zIndex: 50, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid #e4f5e9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0a3d28, #1D9E75)',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
              Memória do Assessor
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>
              O que eu sei sobre {primeiroNome}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            width: 32, height: 32, borderRadius: '50%',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <X size={16}/>
          </button>
        </div>

        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {items.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8db89d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Perfil
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: '#f8fdf9',
                    borderRadius: 10, border: '1px solid #e4f5e9',
                  }}>
                    <div style={{ color: '#1D9E75', flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#8db89d', fontWeight: 600, marginBottom: 1 }}>{item.label}</div>
                      <div style={{ fontSize: 13, color: '#1a3a1a', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metas.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8db89d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Suas metas ({metas.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {metas.slice(0, 4).map((meta, i) => {
                  const pct = meta.valor_alvo > 0
                    ? Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100))
                    : 0
                  return (
                    <div key={i} style={{
                      padding: '10px 12px', background: '#f8fdf9',
                      borderRadius: 10, border: '1px solid #e4f5e9',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, color: '#1a3a1a', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
                          {meta.nome}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#1D9E75', flexShrink: 0 }}>{pct}%</div>
                      </div>
                      <div style={{ height: 4, background: '#e4f5e9', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: 'linear-gradient(90deg, #1D9E75, #00C853)',
                          borderRadius: 2, transition: 'width 0.4s',
                        }}/>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <div style={{ fontSize: 10, color: '#8db89d' }}>
                          R${meta.valor_atual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: 10, color: '#8db89d' }}>
                          R${meta.valor_alvo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{
            padding: '12px 14px', background: '#f0fdf4',
            borderRadius: 10, border: '1px solid #bbf7d0',
            marginTop: 'auto',
          }}>
            <div style={{ fontSize: 11, color: '#166534', lineHeight: 1.5 }}>
              🔒 Essas informações ficam salvas de forma segura e só são usadas para personalizar as respostas do seu Assessor.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Contador de mensagens ────────────────────────────────────────────────────

function MessageCounter({
  usadas,
  limite,
  plano,
}: {
  usadas: number
  limite: number
  plano: string
}) {
  if (plano === 'premium') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C853' }}/>
        <span style={{ fontSize: 11, color: '#1D9E75', fontWeight: 700 }}>Ilimitado · Premium</span>
      </div>
    )
  }

  const restantes = Math.max(0, limite - usadas)
  const pct = Math.min(100, (usadas / limite) * 100)
  const cor = pct >= 100 ? '#FF4C4C' : pct >= 70 ? '#FF9F00' : '#1D9E75'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 48, height: 4, background: '#e4f5e9', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: cor, borderRadius: 2,
          transition: 'width 0.3s, background 0.3s',
        }}/>
      </div>
      <span style={{ fontSize: 11, color: pct >= 100 ? '#FF4C4C' : '#8db89d', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {restantes > 0
          ? `${restantes} de ${limite} restantes`
          : `Limite atingido`}
      </span>
    </div>
  )
}

// ─── Botão de voz ────────────────────────────────────────────────────────────

function VoiceButton({
  isPro,
  isListening,
  isDisabled,
  onToggle,
}: {
  isPro: boolean
  isListening: boolean
  isDisabled: boolean
  onToggle: () => void
}) {
  // Usuário free: botão bloqueado com link para Pro
  if (!isPro) {
    return (
      <a
        href="/dashboard/pro"
        title="Recurso exclusivo Pro — clique para assinar"
        style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
          background: '#f0fdf4', border: '1.5px solid #bbf7d0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', textDecoration: 'none', position: 'relative',
          transition: 'background 0.15s',
        }}
      >
        <Mic size={16} color="#8db89d" />
        {/* Badge de cadeado */}
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#00C853', border: '1.5px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 7, color: '#fff', fontWeight: 900,
        }}>
          ★
        </div>
      </a>
    )
  }

  // Usuário Pro: botão funcional
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      title={isListening ? "Parar gravação" : "Falar com o Assessor"}
      style={{
        flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
        background: isListening ? '#FF4C4C' : '#f0fdf4',
        border: `1.5px solid ${isListening ? '#FF4C4C' : '#bbf7d0'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.4 : 1,
        transition: 'all 0.2s',
        animation: isListening ? 'pulse-mic 1.2s ease-in-out infinite' : 'none',
      }}
    >
      {isListening
        ? <MicOff size={16} color="#fff" />
        : <Mic size={16} color="#1D9E75" />
      }
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AssessorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [limiteAtingido, setLimiteAtingido] = useState(false);
  const [infoLimite, setInfoLimite] = useState<{usadas:number;limite:number;plano:string}|null>(null);
  const [planoUsuario, setPlanoUsuario] = useState<string>("free");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [userCtx, setUserCtx] = useState<UserContext | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // ─── Voz ──────────────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  // ──────────────────────────────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowser();
  const searchParams = useSearchParams();
  const fromScore = searchParams.get("from") === "score";

  // ─── Voice: inicializa Web Speech API ────────────────────────────────────
  const isPro = planoUsuario === 'pro' || planoUsuario === 'premium';

  const toggleListening = useCallback(() => {
    if (!isPro) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz. Use o Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      // Auto-envia após 300ms para o usuário ver o que foi transcrito
      setTimeout(() => {
        send(transcript);
      }, 300);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [isPro, isListening]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [historyRes, perfilRes, memRes, metasRes, summaryRes] = await Promise.allSettled([
        supabase.from("chat_history").select("role,content").eq("user_id", user.id).order("created_at", { ascending: true }).limit(50),
        supabase.from("user_profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("user_memory").select("*").eq("user_id", user.id).single(),
        supabase.from("metas").select("nome,valor_alvo,valor_atual,prazo").eq("user_id", user.id),
        (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          return fetch("/api/dashboard/summary", { headers: { Authorization: `Bearer ${session?.access_token}` } });
        })(),
      ]);

      if (historyRes.status === "fulfilled" && historyRes.value.data?.length) {
        setMessages(historyRes.value.data.map(m => {
          const { text, plan } = parsePlan(m.content)
          return { role: m.role as "user" | "assistant", content: text, plan: plan ?? undefined }
        }))
      }

      const perfil = perfilRes.status === "fulfilled" ? perfilRes.value.data ?? {} : {}
      const mem = memRes.status === "fulfilled" ? memRes.value.data ?? {} : {}
      const metas = metasRes.status === "fulfilled" ? metasRes.value.data ?? [] : []

      if (perfil.plan) setPlanoUsuario(perfil.plan);

      let renda = 0; let gastos = 0;
      if (summaryRes.status === "fulfilled") {
        const resp = summaryRes.value as Response;
        if (resp.ok) {
          const s = await resp.json();
          renda = s.renda ?? 0;
          gastos = s.gastos ?? 0;
        }
      }

      setUserCtx({ renda, gastos, metas, perfil, mem })

      const historyData = historyRes.status === "fulfilled" ? historyRes.value.data : null;
      if (fromScore && (!historyData?.length)) {
        const diag = perfil?.diagnostico_json as Record<string, unknown> | null;
        const score = diag?.score ?? perfil?.score_saude ?? null;
        const titulo = diag?.titulo ?? "";
        const plano = Array.isArray(diag?.plano_30_dias) ? (diag.plano_30_dias as string[]) : [];
        const nome = (perfil?.nome_preferido as string) || (perfil?.nome as string)?.split(" ")[0] || "você";
        const objetivo = mem?.objetivo ?? perfil?.perfil_financeiro ?? "";

        const contexto = [
          score !== null ? `Score iMoney: ${score}/100 (${titulo})` : "",
          objetivo ? `Objetivo principal: ${objetivo}` : "",
          renda > 0 ? `Renda: R$ ${renda.toLocaleString("pt-BR")}` : "",
          gastos > 0 ? `Gastos: R$ ${gastos.toLocaleString("pt-BR")}` : "",
          plano.length > 0 ? `Plano 30 dias: ${plano.slice(0, 2).join("; ")}` : "",
        ].filter(Boolean).join(" | ");

        const prompt = `O usuário ${nome} acabou de ver seu diagnóstico financeiro. ${contexto}. 
Escreva uma mensagem de abertura como Assessor IA pessoal dele: acolhedora, específica para o score e situação dele, e que termine com UMA pergunta concreta para começar o plano de ação. Máximo 4 linhas. Seja direto e humano, não genérico.`;

        try {
          const { data: { session: sess } } = await supabase.auth.getSession();
          const resp = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess?.access_token}` },
            body: JSON.stringify({
              messages: [{ role: "user", content: prompt }],
              context: { renda, gastos, metas, perfil, mem },
              proactive: true,
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            const text = data.message ?? data.content ?? "";
            if (text) {
              const { text: parsed, plan } = parsePlan(text);
              setMessages([{ role: "assistant", content: parsed, plan: plan ?? undefined }]);
            }
          }
        } catch { /* silencioso */ }
      }

      setHistoryLoaded(true);
    }
    load();
  }, [supabase, fromScore]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setInput("");

    const newMsg: Message = { role: "user", content };
    const updated = [...messages, newMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      const [memRes, metasRes, perfilRes, ecoRes, summaryRes] = await Promise.allSettled([
        supabase.from("user_memory").select("*").eq("user_id", user!.id).single(),
        supabase.from("metas").select("*").eq("user_id", user!.id),
        supabase.from("user_profiles").select("*").eq("user_id", user!.id).single(),
        fetch("/api/rates/eco"),
        fetch("/api/dashboard/summary", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }),
      ]);

      const mem = memRes.status === "fulfilled" ? memRes.value.data ?? {} : {};
      const metas = metasRes.status === "fulfilled" ? metasRes.value.data ?? [] : [];
      const perfil = perfilRes.status === "fulfilled" ? perfilRes.value.data ?? {} : {};
      const eco = ecoRes.status === "fulfilled" && ecoRes.value.ok ? await ecoRes.value.json() : { selic_anual: 14.50, ipca_mensal: 0.56 };
      const summary = summaryRes.status === "fulfilled" && summaryRes.value.ok ? await summaryRes.value.json() : null;

      const renda = summary?.renda ?? mem.last_renda ?? 0;
      const gastos = summary?.gastos ?? mem.last_gastos ?? 0;
      const gastosCat = summary?.gastosCat ?? mem.gastos_categorias ?? {};

      const [invRes, transRes] = await Promise.allSettled([
        supabase.from("user_investments").select("nome,tipo,moeda,valor_original,valor_brl").eq("user_id", user!.id),
        supabase.from("transactions").select("descricao,valor,tipo,categoria,data").eq("user_id", user!.id).order("data", { ascending: false }).limit(20),
      ]);
      const dadosInvestimentos = invRes.status === "fulfilled" ? invRes.value.data ?? [] : [];
      const dadosTransacoes = transRes.status === "fulfilled" ? transRes.value.data ?? [] : [];
      const patrimonioTotal = dadosInvestimentos.reduce((s: number, i: Record<string, number>) => s + (i.valor_brl ?? i.valor_original ?? 0), 0);

      const startTime = Date.now();
      const conversationId = messages[0]?.content?.slice(0,8) || "new";
      amplitude.track("AI Message Sent", {
        assistant_mode: "assessor",
        message_intent: "financial_query",
        message_length: content.length,
        conversation_id: conversationId,
      });

      const messagesParaApi = updated.map(m => ({
        role: m.role,
        content: m.plan ? `${m.content}\n\n\`\`\`plano\n${JSON.stringify(m.plan)}\n\`\`\`` : m.content,
      }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: messagesParaApi,
          context: {
            renda, gastos, sobra: renda - gastos,
            monthly_available: perfil.monthly_available ?? (renda - gastos),
            selic: eco.selic_anual,
            ipca: eco.ipca_mensal,
            ipca_anual: eco.ipca_anual,
            metas,
            gastosCat,
            investimentos: dadosInvestimentos,
            transacoes_recentes: dadosTransacoes,
            patrimonio_total: patrimonioTotal,
            perfilUsuario: perfil,
            idade: perfil.idade,
            cidade: perfil.cidade,
            estado: perfil.estado,
            ocupacao: perfil.ocupacao,
            filhos: perfil.filhos,
            plano: perfil.plan,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.limite_atingido) {
          setLimiteAtingido(true)
          setInfoLimite({ usadas: data.usadas, limite: data.limite, plano: data.plano })
        }
        throw new Error(data.error ?? "Erro");
      }

      amplitude.track("AI Response Received", {
        assistant_mode: "assessor",
        response_type: data.reply?.includes("```plano") ? "plan" : "text",
        response_latency_ms: Date.now() - startTime,
        conversation_id: messages[0]?.content?.slice(0,8) || "new",
      });

      if (data.usadas !== undefined) {
        const novoInfo = { usadas: data.usadas, limite: data.limite ?? 3, plano: data.plano ?? planoUsuario }
        setInfoLimite(novoInfo)
        setUserCtx(prev => prev ? { ...prev } : prev)
      }
      const { text: replyText, plan } = parsePlan(data.reply)
      const assistantMsg: Message = { role: "assistant", content: replyText, plan: plan ?? undefined }
      setMessages(prev => [...prev, assistantMsg]);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, supabase]);

  async function clearHistory() {
    if (!confirm("Apagar todo o histórico?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("chat_history").delete().eq("user_id", user.id);
    setMessages([]);
  }

  const contextualStarters = buildContextualStarters(userCtx);
  const usadas = infoLimite?.usadas ?? 0;
  const limite = infoLimite?.limite ?? (planoUsuario === 'premium' ? 999 : planoUsuario === 'pro' ? 50 : 15);

  return (
    <>
      {userCtx && (
        <MemorySidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          perfil={userCtx.perfil}
          mem={userCtx.mem}
          metas={userCtx.metas}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0d2414', fontFamily: 'Nunito, sans-serif', margin: 0 }}>
              💬 Assessor
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {userCtx && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 8, padding: '6px 12px',
                  cursor: 'pointer', color: '#166534',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700,
                  transition: 'background 0.15s',
                }}
                title="O que eu sei sobre você"
              >
                <Brain size={14}/>
                <span style={{ display: 'none' }} className="sm:inline">Memória</span>
                <ChevronRight size={12}/>
              </button>
            )}
            {messages.length > 0 && (
              <button onClick={clearHistory} style={{ background: 'none', border: '1px solid #e4f5e9', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#8db89d', display: 'flex', alignItems: 'center' }} title="Limpar">
                <Trash2 size={16}/>
              </button>
            )}
          </div>
        </div>

        {/* Conversation starters */}
        {messages.length === 0 && historyLoaded && (
          <div style={{ marginBottom: 16, flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#8db89d', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
              {userCtx ? 'Baseado no seu perfil' : 'Ações rápidas'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {contextualStarters.map(({ label, prompt }) => (
                <button key={label} onClick={() => send(prompt)} style={{
                  padding: '8px 16px', borderRadius: 999,
                  border: '1.5px solid rgba(26,58,26,0.15)',
                  background: '#fff', color: '#1a3a1a',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: '"Nunito", sans-serif',
                  transition: 'border-color 0.15s, background 0.15s',
                }}>{label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 && historyLoaded && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <p style={{ fontWeight: 700, color: '#0d2414', margin: '0 0 6px', fontSize: 15 }}>Olá! Sou seu assessor financeiro IA.</p>
              <p style={{ fontSize: 13, color: '#6b9e80', maxWidth: 300, margin: 0, lineHeight: 1.5 }}>
                Faça uma pergunta ou use as sugestões acima para começar.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === "user" ? 'flex-end' : 'flex-start', gap: 10 }}>
              {msg.role === "assistant" && (
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#00c853',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0, marginTop: 2,
                }}>🧭</div>
              )}
              <div style={{ maxWidth: msg.plan ? '100%' : '78%', width: msg.plan ? '100%' : undefined, minWidth: 0 }}>
                {msg.content && (
                  <div style={{
                    borderRadius: msg.role === "user" ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '12px 16px', fontSize: 14, lineHeight: 1.55,
                    background: msg.role === "user" ? '#1a3a1a' : '#e8f5e9',
                    color: msg.role === "user" ? '#fff' : '#1a3a1a',
                    fontFamily: '"Nunito", sans-serif',
                    marginBottom: msg.plan ? 12 : 0,
                  }}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-[#1a3a1a] prose-headings:font-black prose-p:text-[#1a3a1a] prose-strong:text-[#1a3a1a] prose-li:text-[#1a3a1a] prose-a:text-[#00c853]">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                    )}
                  </div>
                )}
                {msg.plan && <PlanCards plan={msg.plan} />}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: '#00c853',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0, marginTop: 2,
              }}>🧭</div>
              <div style={{ background: '#e8f5e9', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ background: '#00c853', width: 8, height: 8, borderRadius: '50%', display: 'block', animation: `bounce 1s ${i * 150}ms ease-in-out infinite` }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input area */}
        <div style={{ flexShrink: 0, marginTop: 8 }}>
          {/* Banner de limite (free) */}
          {infoLimite && planoUsuario === 'free' && (() => {
            const usadas = infoLimite.usadas
            const limite = infoLimite.limite
            const pct = usadas / limite
            const restantes = limite - usadas

            if (pct >= 0.7 && pct < 0.9 && !limiteAtingido) return (
              <div style={{ padding: '10px 16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px 12px 0 0', marginBottom: -8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚡</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                    {restantes} mensagem{restantes !== 1 ? 's' : ''} restante{restantes !== 1 ? 's' : ''} hoje
                  </span>
                </div>
                <a href="/dashboard/pro" style={{ fontSize: 12, fontWeight: 800, color: '#F97316', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Ver Pro →
                </a>
              </div>
            )

            if (pct >= 0.9 && !limiteAtingido) return (
              <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #7C2D12, #C2410C)', borderRadius: '12px 12px 0 0', marginBottom: -8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
                      🔥 Última mensagem do dia!
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                      Não perca o fio da conversa — continue amanhã ou assine agora
                    </div>
                  </div>
                  <a href="/dashboard/pro" style={{ background: '#fff', color: '#C2410C', fontWeight: 800, fontSize: 12, padding: '8px 16px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Assinar Pro
                  </a>
                </div>
              </div>
            )

            if (limiteAtingido) return (
              <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0a3d28, #1D9E75)', borderRadius: '16px 16px 0 0', marginBottom: -8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
                      Limite de hoje atingido ({infoLimite.limite} msgs)
                    </div>
                    <div style={{ fontSize: 12, color: '#9FE1CB' }}>
                      Não deixe seu plano financeiro parar — o Pro tem 50 msgs/dia
                    </div>
                  </div>
                  <a href="/dashboard/pro" style={{ background: '#fff', color: '#1D9E75', fontWeight: 800, fontSize: 13, padding: '10px 20px', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Assinar Pro — R$ 14,90/mês
                  </a>
                </div>
              </div>
            )

            return null
          })()}

          {/* Banner de escuta ativa (Pro) */}
          {isListening && (
            <div style={{
              padding: '10px 16px', marginBottom: 8,
              background: 'linear-gradient(135deg, #0a3d28, #1D9E75)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{
                    width: 3, borderRadius: 3,
                    background: '#fff',
                    animation: `wave ${0.6 + i * 0.1}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                  }}/>
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                Ouvindo... fale sua pergunta
              </span>
              <button
                onClick={toggleListening}
                style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            style={{ display: 'flex', gap: 8, background: '#fff', border: '1px solid #e4f5e9', borderRadius: 20, padding: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Botão de voz — sempre visível, bloqueado para free */}
            <VoiceButton
              isPro={isPro}
              isListening={isListening}
              isDisabled={loading || limiteAtingido}
              onToggle={toggleListening}
            />

            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }}}
              placeholder={isListening ? "Ouvindo..." : "Digite ou fale sua pergunta financeira..."}
              rows={1}
              style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#0d2414', padding: '6px 8px', maxHeight: 128, fontFamily: 'Nunito, sans-serif' }}
              disabled={loading || limiteAtingido || isListening}
            />
            <button type="submit" disabled={!input.trim() || loading || limiteAtingido} style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
              background: '#1a3a1a', border: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: (!input.trim() || loading || limiteAtingido) ? 'not-allowed' : 'pointer',
              opacity: (!input.trim() || loading || limiteAtingido) ? 0.4 : 1,
              transition: 'opacity 150ms',
            }}>
              <Icon name="send" size={16} color="#fff" />
            </button>
          </form>

          {/* Contador sempre visível */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingInline: 4 }}>
            <MessageCounter
              usadas={usadas}
              limite={limite}
              plano={planoUsuario}
            />
            {/* Hint de voz para free */}
            {!isPro && (
              <a href="/dashboard/pro" style={{ fontSize: 11, color: '#8db89d', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <Mic size={11}/>
                Voz disponível no Pro
              </a>
            )}
          </div>
        </div>

        <style>{`
          @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
          @keyframes pulse-mic { 0%,100%{box-shadow:0 0 0 0 rgba(255,76,76,0.4)} 50%{box-shadow:0 0 0 8px rgba(255,76,76,0)} }
          @keyframes wave { from{height:4px} to{height:16px} }
        `}</style>
      </div>
    </>
  );
}
