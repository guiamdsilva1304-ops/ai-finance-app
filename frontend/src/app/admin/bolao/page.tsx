"use client";
import { useEffect, useState } from "react";

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  stage: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  advanced_team: string | null;
}

interface ScoreState {
  home: string;
  away: string;
  advanced: string;
  loading: boolean;
  error: string;
}

const KNOCKOUT = new Set(["Dezesseis-avos", "Oitavas", "Quartas", "Semifinal", "3º Lugar", "Final"]);

const TZ = "America/Sao_Paulo";

function brasiliaDateKey(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
}

function formatDayHeader(dateKey: string) {
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })
    .replace(",", ",")
    .replace(/^\w/, c => c.toUpperCase());
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: TZ,
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
          init[m.id] = { home: "", away: "", advanced: "", loading: false, error: "" };
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

    // Mata-mata com empate: exige classificado
    const isKnockout = KNOCKOUT.has(match.stage ?? "");
    if (isKnockout && home === away && !s.advanced) {
      setScores(p => ({
        ...p,
        [match.id]: { ...p[match.id], error: "Empate na prorrogação: selecione o classificado nos pênaltis" },
      }));
      return;
    }

    setScores(p => ({ ...p, [match.id]: { ...p[match.id], loading: true, error: "" } }));
    try {
      const res = await fetch("/api/admin/bolao-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: match.id,
          home_score: home,
          away_score: away,
          advanced_team: s.advanced || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScores(p => ({ ...p, [match.id]: { ...p[match.id], loading: false, error: data.error ?? "Erro desconhecido" } }));
        return;
      }
      setMatches(prev =>
        prev.map(m =>
          m.id === match.id
            ? { ...m, status: "finished", home_score: home, away_score: away, advanced_team: s.advanced || null }
            : m
        )
      );
      setScores(p => ({ ...p, [match.id]: { home: "", away: "", advanced: "", loading: false, error: "" } }));
    } catch {
      setScores(p => ({ ...p, [match.id]: { ...p[match.id], loading: false, error: "Erro de rede" } }));
    }
  }

  const grouped: { dateKey: string; items: Match[] }[] = [];
  for (const m of matches) {
    const key = brasiliaDateKey(m.match_date);
    const last = grouped[grouped.length - 1];
    if (last && last.dateKey === key) {
      last.items.push(m);
    } else {
      grouped.push({ dateKey: key, items: [m] });
    }
  }

  if (loading) {
    return (
      <div className="px-5 pb-16 pt-7 text-[#16241a]" style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
        <div className="mx-auto max-w-[900px]">
          <p className="text-sm text-[#5c7568]">Carregando jogos…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-16 pt-7 text-[#16241a]" style={{ fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <div className="mx-auto max-w-[900px]">
        <h1 className="mb-1 text-lg font-black text-[#16241a]">⚽ Bolão Copa 2026</h1>
        <p className="mb-6 text-xs text-[#5c7568]">
          Registre os placares manualmente. Em jogos de mata-mata decididos nos pênaltis, selecione o time classificado.
        </p>

        {matches.length === 0 && (
          <div className="rounded-2xl border border-[#00C853]/15 bg-white px-4 py-10 text-center text-sm text-[#5c7568]">
            Nenhum jogo cadastrado ainda.
          </div>
        )}

        <div className="space-y-6">
          {grouped.map(({ dateKey, items }) => (
            <div key={dateKey} className="rounded-2xl border border-[#00C853]/15 bg-white overflow-hidden">
              {/* Cabeçalho do dia */}
              <div className="border-b border-[#00C853]/15 bg-[#f5f8f5] px-4 py-2.5">
                <span className="text-[13px] font-extrabold text-[#00C853]">
                  {formatDayHeader(dateKey)}
                </span>
              </div>

              {/* Header de colunas */}
              <div className="grid grid-cols-[56px_1fr_130px_140px] border-b border-[#1a3a1a]/10 px-4 py-1.5">
                <span className="text-[10px] font-bold uppercase text-[#5c7568]">Hora</span>
                <span className="text-[10px] font-bold uppercase text-[#5c7568]">Jogo</span>
                <span className="text-[10px] font-bold uppercase text-[#5c7568]">Fase</span>
                <span className="text-[10px] font-bold uppercase text-[#5c7568]">Resultado</span>
              </div>

              {/* Linhas de jogos */}
              {items.map((m, i) => {
                const finished = m.status === "finished";
                const isFuture = new Date(m.match_date) > new Date();
                const isKnockout = KNOCKOUT.has(m.stage ?? "");
                const s = scores[m.id] ?? { home: "", away: "", advanced: "", loading: false, error: "" };

                return (
                  <div
                    key={m.id}
                    className={`grid grid-cols-[56px_1fr_130px_140px] items-start gap-0 px-4 py-3 ${
                      i % 2 === 0 ? "bg-white" : "bg-[#f5f8f5]"
                    } ${finished ? "opacity-70" : ""}`}
                  >
                    {/* Hora BRT */}
                    <span className="text-[12px] text-[#5c7568] pt-0.5">{formatTime(m.match_date)}</span>

                    {/* Times */}
                    <div className="min-w-0 pt-0.5">
                      <span className="block truncate text-[13px] font-bold text-[#16241a]">
                        {m.home_team} <span className="text-[#5c7568]">×</span> {m.away_team}
                      </span>
                    </div>

                    {/* Fase */}
                    <span className="truncate text-[11px] text-[#5c7568] pt-0.5">
                      {m.stage ?? "—"}
                    </span>

                    {/* Resultado / Inputs */}
                    <div>
                      {finished ? (
                        <div>
                          <span className="text-[14px] font-black text-[#00C853]">
                            {m.home_score} × {m.away_score} ✓
                          </span>
                          {m.advanced_team && (
                            <p className="text-[10px] text-[#5c7568] mt-0.5">
                              {m.advanced_team} (pên.)
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={s.home}
                              onChange={e => setScores(p => ({ ...p, [m.id]: { ...p[m.id], home: e.target.value } }))}
                              placeholder="—"
                              className="w-9 rounded-lg border border-[#00C853]/20 bg-white px-1.5 py-1 text-center text-[13px] font-bold text-[#16241a] outline-none focus:border-[#00C853]/60"
                            />
                            <span className="text-[11px] text-[#5c7568]">×</span>
                            <input
                              type="number"
                              min={0}
                              value={s.away}
                              onChange={e => setScores(p => ({ ...p, [m.id]: { ...p[m.id], away: e.target.value } }))}
                              placeholder="—"
                              className="w-9 rounded-lg border border-[#00C853]/20 bg-white px-1.5 py-1 text-center text-[13px] font-bold text-[#16241a] outline-none focus:border-[#00C853]/60"
                            />
                            <button
                              onClick={() => salvar(m)}
                              disabled={s.loading}
                              className="rounded-lg bg-[#00C853]/15 px-2 py-1 text-[11px] font-bold text-[#00C853] hover:bg-[#00C853]/25 disabled:opacity-40"
                            >
                              {s.loading ? "…" : "✓"}
                            </button>
                          </div>

                          {/* Dropdown de classificado — apenas para mata-mata */}
                          {isKnockout && (
                            <select
                              value={s.advanced}
                              onChange={e => setScores(p => ({ ...p, [m.id]: { ...p[m.id], advanced: e.target.value } }))}
                              className="w-full rounded-lg border border-[#00C853]/20 bg-white px-1.5 py-1 text-[11px] text-[#16241a] outline-none focus:border-[#00C853]/60"
                            >
                              <option value="">Pênaltis? Classificado:</option>
                              <option value={m.home_team}>{m.home_team}</option>
                              <option value={m.away_team}>{m.away_team}</option>
                            </select>
                          )}

                          {isFuture && (
                            <p className="text-[10px] text-[#5c7568]">ainda não começou</p>
                          )}
                          {s.error && (
                            <p className="text-[10px] text-[#d32f2f]">{s.error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
