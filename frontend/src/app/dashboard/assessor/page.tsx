"use client";
import { amplitude } from "@/app/amplitude";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Trash2 } from "lucide-react";
import { Icon } from "@/components/imoney/primitives";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message { role: "user" | "assistant"; content: string }

const QUICK_ACTIONS = [
  { label: "📊 Onde investir minha sobra?", prompt: "Analise minha situação financeira e me diga onde devo investir minha sobra mensal considerando a SELIC atual e meu perfil." },
  { label: "✂️ Como cortar gastos?", prompt: "Analise meus gastos por categoria e me diga onde posso reduzir de forma inteligente." },
  { label: "🎯 Como alcançar minhas metas?", prompt: "Com base no meu perfil e situação atual, qual a melhor estratégia para alcançar minhas metas?" },
  { label: "🛡️ Reserva de emergência", prompt: "Como devo montar minha reserva de emergência? Quanto preciso guardar e onde?" },
];

export default function AssessorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [limiteAtingido, setLimiteAtingido] = useState(false);
  const [infoLimite, setInfoLimite] = useState<{usadas:number;limite:number;plano:string}|null>(null);
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
      if (data?.length) setMessages(data as Message[]);
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

      // Busca investimentos e transacoes para contexto do Assessor
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: updated,
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
      if (!res.ok) throw new Error(data.error ?? "Erro");

      amplitude.track("AI Response Received", {
        assistant_mode: "assessor",
        response_type: "text",
        response_latency_ms: Date.now() - startTime,
        conversation_id: messages[0]?.content?.slice(0,8) || "new",
      });
      const assistantMsg = { role: "assistant" as const, content: data.reply };
      setMessages(prev => [...prev, assistantMsg]);

      // histórico salvo pelo backend (/api/chat)
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
    <div className="flex flex-col h-screen p-5 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
            💬 Assessor
          </h1>
          <p className="text-sm text-[#6b9e80]"></p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="btn-ghost p-2.5 text-[#8db89d] hover:text-red-500" title="Limpar">
            <Trash2 size={16}/>
          </button>
        )}
      </div>

      {messages.length === 0 && historyLoaded && (
        <div className="mb-4 shrink-0">
          <p className="text-xs font-bold text-[#8db89d] uppercase tracking-wider mb-2.5">Ações rápidas</p>
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

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && historyLoaded && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="text-5xl mb-3">🤖</div>
            <p className="font-bold text-[#0d2414]">Olá! Sou seu assessor financeiro IA.</p>
            <p className="text-sm text-[#6b9e80] mt-1 max-w-sm">
              Faça uma pergunta ou use as ações rápidas acima para começar.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")} style={{ gap: 10 }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: '#00c853',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0, marginTop: 2,
              }}>🧭</div>
            )}
            <div style={{
              maxWidth: '78%', borderRadius: msg.role === "user" ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '12px 16px', fontSize: 14, lineHeight: 1.55,
              background: msg.role === "user" ? '#1a3a1a' : '#e8f5e9',
              color: msg.role === "user" ? '#fff' : '#1a3a1a',
              fontFamily: '"Nunito", sans-serif',
            }}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-headings:text-[#1a3a1a] prose-headings:font-black prose-p:text-[#1a3a1a] prose-strong:text-[#1a3a1a] prose-li:text-[#1a3a1a] prose-a:text-[#00c853]">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap" style={{ margin: 0 }}>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start" style={{ gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: '#00c853',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0, marginTop: 2,
            }}>🧭</div>
            <div style={{ background: '#e8f5e9', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: '#00c853', animationDelay: `${i * 150}ms`, width: 8, height: 8, borderRadius: '50%', display: 'block' }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div className="shrink-0 mt-3">
        {limiteAtingido && infoLimite && (
        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0a3d28, #1D9E75)', borderTop: '1px solid #1D9E75' }}>
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
          className="flex gap-2 bg-white border border-[#e4f5e9] rounded-2xl p-2 shadow-sm">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }}}
            placeholder="Digite sua pergunta financeira..."
            rows={1}
            className="flex-1 resize-none bg-transparent border-none outline-none text-sm text-[#0d2414] placeholder:text-[#8db89d] py-2 px-2 max-h-32"
            style={{ fontFamily: "Nunito Sans, sans-serif" }}
            disabled={loading}
          />
          <button type="submit" disabled={!input.trim() || loading} style={{
            flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
            background: '#1a3a1a', border: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', opacity: (!input.trim() || loading) ? 0.4 : 1,
            transition: 'opacity 150ms',
          }}>
            <Icon name="send" size={16} color="#fff" />
          </button>
        </form>
        <p className="text-[11px] text-center text-[#8db89d] mt-1.5">
          Histórico salvo entre sessões · máx. 30 msgs/hora
        </p>
      </div>
    </div>
  );
}
