"use client";
import { useEffect, useState } from "react";

interface Stage { label: string; count: number; pctAnterior: number | null }

// verde escuro → verde brilhante, uma cor por etapa
const CORES = ["#0d5435", "#11733f", "#15914a", "#19af54", "#00C853"];

export default function FunnelChart() {
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/admin/funnel")
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Erro ao carregar funil");
        setStages(data.stages);
      })
      .catch(e => setErro(e instanceof Error ? e.message : "Erro"));
  }, []);

  if (erro) return <p className="rounded-xl border border-[#ff5252]/30 bg-[#ff5252]/5 p-3 text-xs text-[#ff5252]">Funil indisponível: {erro}</p>;
  if (!stages) return <div className="h-[120px] animate-pulse rounded-2xl bg-[#0e1a10]" />;

  const max = Math.max(1, ...stages.map(s => s.count));

  return (
    <div className="rounded-2xl border border-[#00C853]/10 bg-[#0e1a10] p-5">
      <div className="grid grid-cols-5 gap-2">
        {stages.map((s, i) => (
          <div key={s.label} className="flex flex-col">
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#3a6b45]">{s.label}</p>
            <p className="mt-1 text-xl font-black text-white">{s.count}</p>
            <p className="h-4 text-[10px] font-bold text-[#dff0e3]/50">
              {s.pctAnterior !== null ? `${s.pctAnterior.toFixed(0)}% da anterior` : "topo do funil"}
            </p>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(s.count / max) * 100}%`, background: CORES[i] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
