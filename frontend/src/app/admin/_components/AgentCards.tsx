"use client";
import { useCallback, useEffect, useState } from "react";

interface AgentStatus {
  id: string;
  nome: string;
  emoji: string;
  cron: string | null;
  cronLabel: string;
  isPaused: boolean;
  ultimaExecucao: string | null;
  ultimoNivel: string | null;
  ultimoResumo: string | null;
  usdUsed: number | null;
  usdLimit: number | null;
}

interface LogEntry {
  id: string;
  level: string;
  action: string;
  summary: string | null;
  tokens_used: number | null;
  duration_ms: number | null;
  created_at: string;
}

// Próxima execução de crons no formato "m h * * *", "m h * * 1,3,5" ou "m h 1 * *" (UTC)
export function proximaExecucao(cron: string, agora = new Date()): Date | null {
  const partes = cron.split(" ");
  if (partes.length !== 5) return null;
  const [minS, horaS, domS, , dowS] = partes;
  const min = parseInt(minS, 10);
  const hora = parseInt(horaS, 10);
  if (isNaN(min) || isNaN(hora)) return null;

  const dows = dowS === "*" ? null : dowS.split(",").map(Number);
  const dom = domS === "*" ? null : parseInt(domS, 10);

  for (let i = 0; i < 62; i++) {
    const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + i, hora, min, 0));
    if (d.getTime() <= agora.getTime()) continue;
    if (dom !== null && d.getUTCDate() !== dom) continue;
    if (dows && !dows.includes(d.getUTCDay())) continue;
    return d;
  }
  return null;
}

function countdown(alvo: Date, agora: Date): string {
  const s = Math.max(0, Math.floor((alvo.getTime() - agora.getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `em ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `em ${h}h ${m}min`;
  return `em ${m}min`;
}

function relativo(ts: string | null): string {
  if (!ts) return "nunca rodou";
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export default function AgentCards() {
  const [agents, setAgents] = useState<AgentStatus[] | null>(null);
  const [erro, setErro] = useState("");
  const [logsDe, setLogsDe] = useState<AgentStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [agora, setAgora] = useState(new Date());

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/agents/status");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar agentes");
      setAgents(data.agents ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro");
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const abrirLogs = async (a: AgentStatus) => {
    setLogsDe(a);
    setLogs(null);
    const r = await fetch(`/api/admin/agents/status?logs=${a.id}`);
    const data = await r.json();
    setLogs(r.ok ? data.logs ?? [] : []);
  };

  const toggle = async (a: AgentStatus) => {
    const acao = a.isPaused ? "ativar" : "pausar";
    if (!confirm(`Tem certeza que quer ${acao} o ${a.nome}? ${a.isPaused ? "Ele volta a rodar no próximo cron." : "Ele para de rodar até você reativar."}`)) return;
    const r = await fetch("/api/admin/agents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: a.id, paused: !a.isPaused }),
    });
    if (r.ok) carregar();
    else alert((await r.json()).error ?? "Erro no toggle");
  };

  if (erro) return <p className="rounded-xl border border-[#ff5252]/30 bg-[#ff5252]/5 p-3 text-xs text-[#ff5252]">Agentes indisponíveis: {erro}</p>;
  if (!agents) return <div className="h-48 animate-pulse rounded-2xl bg-[#0e1a10]" />;

  return (
    <>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {agents.map(a => {
          const status = a.isPaused ? "inativo" : a.ultimoNivel === "error" ? "erro" : "ativo";
          const prox = a.cron && !a.isPaused ? proximaExecucao(a.cron, agora) : null;
          return (
            <div key={a.id} className="rounded-2xl border border-[#00C853]/10 bg-[#0e1a10] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{a.emoji}</span>
                  <div>
                    <p className="text-[14px] font-extrabold text-white">{a.nome}</p>
                    <p className="text-[10px] text-[#3a6b45]">{a.cronLabel}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  status === "ativo" ? "bg-[#00C853]/10 text-[#00C853]"
                  : status === "erro" ? "bg-[#ff5252]/10 text-[#ff5252]"
                  : "bg-white/5 text-[#6b8f72]"
                }`}>
                  {status === "ativo" && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute h-full w-full animate-ping rounded-full bg-[#00C853] opacity-60" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-[#00C853]" />
                    </span>
                  )}
                  {status === "erro" && <span className="h-1.5 w-1.5 rounded-full bg-[#ff5252]" />}
                  {status === "inativo" && <span className="h-1.5 w-1.5 rounded-full bg-[#6b8f72]" />}
                  {status}
                </span>
              </div>

              <p className="text-[11px] text-[#3a6b45]">Última execução: <span className="text-[#dff0e3]/70">{relativo(a.ultimaExecucao)}</span></p>
              <p className="mt-1 min-h-[32px] text-[12px] leading-snug text-[#dff0e3]/80">
                {a.ultimoResumo ?? "Sem execuções registradas."}
              </p>
              {prox && (
                <p className="mt-1 text-[11px] font-bold text-[#00C853]">⏱ Próxima: {countdown(prox, agora)}</p>
              )}
              {a.usdUsed !== null && a.usdLimit !== null && a.usdLimit > 0 && (
                <p className="mt-1 text-[10px] text-[#3a6b45]">Budget: ${a.usdUsed.toFixed(2)} / ${a.usdLimit.toFixed(2)}</p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => abrirLogs(a)}
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-bold text-[#dff0e3]/70 hover:bg-white/5"
                >
                  📜 Log
                </button>
                <button
                  onClick={() => toggle(a)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${a.isPaused ? "bg-white/10" : "bg-[#00C853]"}`}
                  title={a.isPaused ? "Ativar agente" : "Pausar agente"}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${a.isPaused ? "left-0.5" : "left-[22px]"}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer de logs */}
      {logsDe && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setLogsDe(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[#00C853]/15 bg-[#0a1a0a] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">{logsDe.emoji} Logs — {logsDe.nome}</h3>
              <button onClick={() => setLogsDe(null)} className="text-[#3a6b45] hover:text-white">✕</button>
            </div>
            {!logs && <div className="h-32 animate-pulse rounded-xl bg-[#0e1a10]" />}
            {logs && logs.length === 0 && <p className="text-xs text-[#3a6b45]">Nenhum log registrado.</p>}
            <div className="space-y-2.5">
              {(logs ?? []).map(l => (
                <div key={l.id} className="rounded-xl border border-white/5 bg-[#0e1a10] p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                      l.level === "error" ? "bg-[#ff5252]/15 text-[#ff5252]"
                      : l.level === "warning" ? "bg-[#F9A825]/15 text-[#F9A825]"
                      : l.level === "success" ? "bg-[#00C853]/15 text-[#00C853]"
                      : "bg-white/10 text-[#dff0e3]/60"
                    }`}>{l.level}</span>
                    <span className="text-[10px] text-[#3a6b45]">
                      {new Date(l.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[12px] font-bold text-[#dff0e3]">{l.action}</p>
                  {l.summary && <p className="mt-0.5 text-[11px] text-[#dff0e3]/70">{l.summary}</p>}
                  <p className="mt-1 text-[10px] text-[#3a6b45]">
                    {l.tokens_used ? `${l.tokens_used} tokens` : ""}{l.tokens_used && l.duration_ms ? " · " : ""}{l.duration_ms ? `${(l.duration_ms / 1000).toFixed(1)}s` : ""}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
