"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Send, Trash2, Zap } from "lucide-react";
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
            perfilUsuario: perfil,
            idade: perfil.idade,
            cidade: perfil.cidade,
            estado: perfil.estado,
            ocupacao: perfil.ocupacao,
            filhos: perfil.filhos,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");

      const assistantMsg = { role: "assistant" as const, content: data.reply };
      setMessages(prev => [...prev, assistantMsg]);

      // Save to chat_history
      if (user) {
        await supabase.from("chat_history").insert([
          { user_id: user.id, role: "user", content },
          { user_id: user.id, role: "assistant", content: data.reply },
        ]);
      }
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
            💬 Assessor IA
          </h1>
          <p className="text-sm text-[#6b9e80]">Powered by Claude — contexto financeiro completo</p>
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
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(({ label, prompt }) => (
              <button key={label} onClick={() => send(prompt)}
                className="btn-secondary text-left text-xs py-2.5 px-3 flex items-center gap-2">
                <Zap size={12} className="text-[#16a34a] shrink-0"/>
                {label}
              </button>
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
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center text-white text-xs font-bold shrink-0 mr-2 mt-1">
                IA
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-[#16a34a] text-white rounded-br-sm"
                : "bg-white border border-[#e4f5e9] text-[#0d2414] rounded-bl-sm"
            )}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-headings:text-[#0d2414] prose-headings:font-black prose-p:text-[#0d2414] prose-strong:text-[#0d2414] prose-li:text-[#0d2414] prose-a:text-[#16a34a]">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center text-white text-xs font-bold shrink-0 mr-2 mt-1">
              IA
            </div>
            <div className="bg-white border border-[#e4f5e9] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 bg-[#16a34a] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div className="shrink-0 mt-3">
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
          <button type="submit" disabled={!input.trim() || loading}
            className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#22c55e] flex items-center justify-center text-white disabled:opacity-40 transition-opacity">
            <Send size={16}/>
          </button>
        </form>
        <p className="text-[11px] text-center text-[#8db89d] mt-1.5">
          Histórico salvo entre sessões · máx. 30 msgs/hora
        </p>
      </div>
    </div>
  );
}
