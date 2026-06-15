"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Msg { role: "user" | "assistant"; content: string }

const CHIPS = [
  "Quem está mais próximo de converter hoje?",
  "Qual feature mais usada nos últimos 7 dias?",
  "Quem não acessa há mais de 5 dias?",
  "Qual é meu DAU hoje?",
  "Quem usou o WhatsApp essa semana?",
];

export default function AdminAssessor() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const enviar = async (texto: string) => {
    const t = texto.trim();
    if (!t || loading) return;
    setErro("");
    const novas: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(novas);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: novas.slice(-20) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro no assistente");
      setMsgs([...novas, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro");
      setMsgs(novas);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-5 pb-5 pt-7 text-[#16241a]" style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <div className="mx-auto flex w-full max-w-[800px] flex-1 flex-col">
        <h1 className="mb-1 text-lg font-black text-[#16241a]">💬 Assessor Admin</h1>
        <p className="mb-4 text-xs text-[#5c7568]">IA com as métricas da plataforma no contexto. Sem limite de mensagens.</p>

        <div className="mb-3 flex flex-wrap gap-2">
          {CHIPS.map(c => (
            <button
              key={c}
              onClick={() => enviar(c)}
              disabled={loading}
              className="rounded-full border border-[#00C853]/15 bg-white px-3 py-1.5 text-[11px] font-bold text-[#16241a] hover:border-[#00C853]/40 disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[#1a3a1a]/10 bg-white p-4">
          {msgs.length === 0 && (
            <p className="py-10 text-center text-xs text-[#5c7568]">
              Pergunte sobre usuários, engajamento, MRR ou crescimento — ou use as sugestões acima.
            </p>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user" ? "bg-[#00C853]/15 text-[#16241a]" : "bg-[#f5f8f5] text-[#16241a]"
              }`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-strong:text-[#00803a]">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="m-0 whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-1.5 px-2">
              {[0, 1, 2].map(i => (
                <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#00C853]" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          )}
          {erro && <p className="text-xs text-[#d32f2f]">{erro}</p>}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={e => { e.preventDefault(); enviar(input); }}
          className="mt-3 flex gap-2"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pergunte sobre seus dados…"
            className="flex-1 rounded-xl border border-[#00C853]/15 bg-white px-4 py-3 text-[13px] text-[#16241a] outline-none placeholder:text-[#5c7568] focus:border-[#00C853]/50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-[#00C853] px-5 text-[13px] font-extrabold text-[#0a1f0a] disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
