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

  if (erro) return <p className="rounded-xl border border-[#d32f2f]/30 bg-[#d32f2f]/5 p-3 text-xs text-[#d32f2f]">Funil indisponível: {erro}</p>;
  if (!stages) return <div className="h-[120px] animate-pulse rounded-2xl bg-[#1a3a1a]/[0.06]" />;

  const max = Math.max(1, ...stages.map(s => s.count));

  return (
    <div className="rounded-2xl border border-[#1a3a1a]/10 bg-white p-5">
      <div className="grid grid-cols-5 gap-2">
        {stages.map((s, i) => (
          <div key={s.label} className="flex flex-col">
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#5c7568]">{s.label}</p>
            <p className="mt-1 text-xl font-black text-[#16241a]">{s.count}</p>
            <p className="h-4 text-[10px] font-bold text-[#16241a]">
              {s.pctAnterior !== null ? `${s.pctAnterior.toFixed(0)}% da anterior` : "topo do funil"}
            </p>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#1a3a1a]/[0.06]">
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
