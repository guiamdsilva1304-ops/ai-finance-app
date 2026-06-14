"use client";
import { useEffect, useState } from "react";

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  stage: string | null;
  group_name: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface ScoreState {
  home: string;
  away: string;
  loading: boolean;
  error: string;
}

function formatBrasilia(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminBolao() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<number, ScoreState>>({});

  useEffect(() => {
    fetch("/api/admin/bolao-matches")
      .then(r => r.json())
      .then(data => {
        const list: Match[] = data.matches ?? [];
        setMatches(list);
        const init: Record<number, ScoreState> = {};
        for (const m of list) {
          init[m.id] = { home: "", away: "", loading: false, error: "" };
        }
        setScores(init);
      })
      .finally(() => setLoading(false));
  }, []);

  async function salvar(match: Match) {
    const s = scores[match.id];
    const home = parseInt(s.home, 10);
    const away = parseInt(s.away, 10);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setScores(p => ({ ...p, [match.id]: { ...p[match.id], error: "Placares inválidos" } }));
      return;
    }
    setScores(p => ({ ...p, [match.id]: { ...p[match.id], loading: true, error: "" } }));
    try {
      const res = await fetch("/api/admin/bolao-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: match.id, home_score: home, away_score: away }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScores(p => ({ ...p, [match.id]: { ...p[match.id], loading: false, error: data.error ?? "Erro desconhecido" } }));
        return;
      }
      // Atualiza o estado local da partida para 'finished'
      setMatches(prev =>
        prev.map(m =>
          m.id === match.id ? { ...m, status: "finished", home_score: home, away_score: away } : m
        )
      );
      setScores(p => ({ ...p, [match.id]: { home: "", away: "", loading: false, error: "" } }));
    } catch {
      setScores(p => ({ ...p, [match.id]: { ...p[match.id], loading: false, error: "Erro de rede" } }));
    }
  }

  if (loading) {
    return (
      <div className="px-5 pb-16 pt-7 text-[#dff0e3]" style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
        <div className="mx-auto max-w-[900px]">
          <p className="text-sm text-[#3a6b45]">Carregando jogos…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-16 pt-7 text-[#dff0e3]" style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <div className="mx-auto max-w-[900px]">
        <h1 className="mb-1 text-lg font-black text-white">⚽ Bolão Copa 2026</h1>
        <p className="mb-6 text-xs text-[#3a6b45]">
          Registre os placares manualmente. Ao salvar, os pontos dos palpites são calculados automaticamente.
        </p>

        <div className="rounded-2xl border border-[#00C853]/15 bg-[#0e1a10] overflow-hidden">
          <div className="grid grid-cols-[90px_1fr_140px_100px] gap-0 border-b border-[#00C853]/10 px-4 py-2">
            <span className="text-[11px] font-bold uppercase text-[#3a6b45]">Data (BRT)</span>
            <span className="text-[11px] font-bold uppercase text-[#3a6b45]">Jogo</span>
            <span className="text-[11px] font-bold uppercase text-[#3a6b45]">Fase</span>
            <span className="text-[11px] font-bold uppercase text-[#3a6b45]">Resultado</span>
          </div>

          {matches.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-[#3a6b45]">
              Nenhum jogo cadastrado ainda.
            </div>
          )}

          {matches.map((m, i) => {
            const finished = m.status === "finished";
            const isFuture = new Date(m.match_date) > new Date();
            const s = scores[m.id] ?? { home: "", away: "", loading: false, error: "" };

            return (
              <div
                key={m.id}
                className={`grid grid-cols-[90px_1fr_140px_100px] items-center gap-0 px-4 py-3 ${
                  i % 2 === 0 ? "bg-[#0e1a10]" : "bg-[#0a1408]"
                } ${finished ? "opacity-70" : ""}`}
              >
                {/* Data */}
                <span className="text-[12px] text-[#7aaa87]">{formatBrasilia(m.match_date)}</span>

                {/* Times */}
                <div className="min-w-0">
                  <span className="block truncate text-[13px] font-bold text-white">
                    {m.home_team} <span className="text-[#3a6b45]">×</span> {m.away_team}
                  </span>
                </div>

                {/* Fase */}
                <span className="truncate text-[11px] text-[#3a6b45]">
                  {m.group_name ?? m.stage ?? "—"}
                </span>

                {/* Resultado / Inputs */}
                <div>
                  {finished ? (
                    <span className="text-[14px] font-black text-[#00C853]">
                      {m.home_score} × {m.away_score} ✓
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={s.home}
                          onChange={e => setScores(p => ({ ...p, [m.id]: { ...p[m.id], home: e.target.value } }))}
                          placeholder="—"
                          className="w-9 rounded-lg border border-[#00C853]/20 bg-[#07100a] px-1.5 py-1 text-center text-[13px] font-bold text-white outline-none focus:border-[#00C853]/60"
                        />
                        <span className="text-[11px] text-[#3a6b45]">×</span>
                        <input
                          type="number"
                          min={0}
                          value={s.away}
                          onChange={e => setScores(p => ({ ...p, [m.id]: { ...p[m.id], away: e.target.value } }))}
                          placeholder="—"
                          className="w-9 rounded-lg border border-[#00C853]/20 bg-[#07100a] px-1.5 py-1 text-center text-[13px] font-bold text-white outline-none focus:border-[#00C853]/60"
                        />
                        <button
                          onClick={() => salvar(m)}
                          disabled={s.loading}
                          className="rounded-lg bg-[#00C853]/15 px-2 py-1 text-[11px] font-bold text-[#00C853] hover:bg-[#00C853]/25 disabled:opacity-40"
                        >
                          {s.loading ? "…" : "✓"}
                        </button>
                      </div>
                      {isFuture && (
                        <p className="text-[10px] text-[#3a6b45]">ainda não começou</p>
                      )}
                      {s.error && (
                        <p className="text-[10px] text-[#ff5252]">{s.error}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
