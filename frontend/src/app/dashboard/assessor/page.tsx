"use client";
import { amplitude } from "@/app/amplitude";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Trash2 } from "lucide-react";
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
      {/* Header */}
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

      {/* Barra de progresso das fases */}
      <div style={{ background: '#0a3d28', padding: '8px 18px', display: 'flex', gap: 4 }}>
        {plan.fases.map((_, i) => {
          const cor = FASE_CORES[i % FASE_CORES.length]
          return (
            <div key={i} onClick={() => setExpandido(expandido === i ? null : i)}
              style={{ flex: 1, height: 4, borderRadius: 2, background: cor.badge, opacity: expandido === i ? 1 : 0.4, cursor: 'pointer', transition: 'opacity .2s' }} />
          )
        })}
      </div>

      {/* Fases */}
      <div style={{ background: '#f8fdf9', borderRadius: '0 0 16px 16px', overflow: 'hidden', border: '1px solid #e4f5e9', borderTop: 'none' }}>
        {plan.fases.map((fase, i) => {
          const cor = FASE_CORES[i % FASE_CORES.length]
          const aberta = expandido === i

          return (
            <div key={i} style={{ borderBottom: i < plan.fases.length - 1 ? '1px solid #e4f5e9' : 'none' }}>
              {/* Cabeçalho da fase — clicável */}
              <button
                onClick={() => setExpandido(aberta ? null : i)}
                style={{
                  width: '100%', background: aberta ? cor.bg : '#fff',
                  border: 'none', cursor: 'pointer',
                  padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
                  textAlign: 'left', transition: 'background .15s',
                  overflow: 'hidden',
                }}
              >
                {/* Número */}
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

              {/* Conteúdo expandido */}
              {aberta && (
                <div style={{ padding: '0 18px 18px 18px' }}>
                  {/* Descrição */}
                  <p style={{ fontSize: 13, color: '#4a6860', lineHeight: 1.65, margin: '0 0 14px 0' }}>
                    {fase.descricao}
                  </p>

                  {/* Ações */}
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

                  {/* Marco da fase */}
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

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '10px 0 2px', fontSize: 11, color: '#8db89d' }}>
        Toque em cada fase para ver os detalhes
      </div>
    </div>
  )
}

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "📊 Onde investir minha sobra?", prompt: "Analise minha situação financeira e me diga onde devo investir minha sobra mensal considerando a SELIC atual e meu perfil." },
  { label: "✂️ Como cortar gastos?", prompt: "Analise meus gastos por categoria e me diga onde posso reduzir de forma inteligente." },
  { label: "🎯 Como alcançar minhas metas?", prompt: "Com base no meu perfil e situação atual, me faz um plano detalhado para alcançar minha principal meta." },
  { label: "🛡️ Reserva de emergência", prompt: "Como devo montar minha reserva de emergência? Quanto preciso guardar e onde?" },
];

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AssessorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [limiteAtingido, setLimiteAtingido] = useState(false);
  const [infoLimite, setInfoLimite] = useState<{usadas:number;limite:number;plano:string}|null>(null);
  const [planoUsuario, setPlanoUsuario] = useState<string>("free");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("chat_history")
        .select("role,content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data?.length) {
        setMessages(data.map(m => {
          const { text, plan } = parsePlan(m.content)
          return { role: m.role as "user" | "assistant", content: text, plan: plan ?? undefined }
        }))
      }
      const { data: perfilData } = await supabase.from("user_profiles").select("plan").eq("user_id", user.id).single();
      if (perfilData?.plan) setPlanoUsuario(perfilData.plan);
      setHistoryLoaded(true);
    }
    load();
  }, [supabase]);

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
      const eco = ecoRes.status === "fulfilled" && ecoRes.value.ok ? await ecoRes.value.json() : { selic_anual: 14.75, ipca_mensal: 0.56 };
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
        setInfoLimite({ usadas: data.usadas, limite: data.limite ?? 3, plano: data.plano ?? planoUsuario })
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0d2414', fontFamily: 'Nunito, sans-serif', margin: 0 }}>
            💬 Assessor
          </h1>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} style={{ background: 'none', border: '1px solid #e4f5e9', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#8db89d', display: 'flex', alignItems: 'center' }} title="Limpar">
            <Trash2 size={16}/>
          </button>
        )}
      </div>

      {/* Quick actions */}
      {messages.length === 0 && historyLoaded && (
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#8db89d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, margin: '0 0 10px' }}>Ações rápidas</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_ACTIONS.map(({ label, prompt }) => (
              <button key={label} onClick={() => send(prompt)} style={{
                padding: '8px 16px', borderRadius: 999,
                border: '1.5px solid rgba(26,58,26,0.15)',
                background: '#fff', color: '#1a3a1a',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: '"Nunito", sans-serif',
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
              Faça uma pergunta ou use as ações rápidas acima para começar.
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
              {/* Texto da mensagem */}
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

              {/* Cards do plano */}
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

      {/* Input */}
      <div style={{ flexShrink: 0, marginTop: 8 }}>
        {limiteAtingido && infoLimite && (
          <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0a3d28, #1D9E75)', borderRadius: '16px 16px 0 0', marginBottom: -8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                  Limite diário atingido — {infoLimite.usadas}/{infoLimite.limite} mensagens
                </div>
                <div style={{ fontSize: 12, color: '#9FE1CB' }}>
                  Assine o Pro para acesso ilimitado ao Assessor IA
                </div>
              </div>
              <a href="/dashboard/pro" style={{ background: '#fff', color: '#1D9E75', fontWeight: 800, fontSize: 13, padding: '10px 20px', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Assinar Pro
              </a>
            </div>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }}
          style={{ display: 'flex', gap: 8, background: '#fff', border: '1px solid #e4f5e9', borderRadius: 20, padding: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }}}
            placeholder="Digite sua pergunta financeira..."
            rows={1}
            style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#0d2414', padding: '6px 8px', maxHeight: 128, fontFamily: 'Nunito, sans-serif' }}
            disabled={loading}
          />
          <button type="submit" disabled={!input.trim() || loading} style={{
            flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
            background: '#1a3a1a', border: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            opacity: (!input.trim() || loading) ? 0.4 : 1,
            transition: 'opacity 150ms',
          }}>
            <Icon name="send" size={16} color="#fff" />
          </button>
        </form>
        {!limiteAtingido && (
          <p style={{ fontSize: 11, textAlign: 'center', color: '#8db89d', marginTop: 6 }}>
            {planoUsuario === 'free'
              ? `${infoLimite ? infoLimite.usadas : 0} de 3 mensagens usadas hoje`
              : planoUsuario === 'pro'
              ? '✦ Assessor ilimitado · Plano Pro'
              : '✦ Assessor ilimitado · Plano Premium'}
          </p>
        )}
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
      `}</style>
    </div>
  );
}
