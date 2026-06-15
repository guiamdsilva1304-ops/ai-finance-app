"use client";
import { useEffect, useState } from "react";

interface ShareMetrics {
  conquistas: number;
  shares: number;
  cancelados: number;
  taxaShare: number | null;
  porCanal: { web_share: number; clipboard: number; cancelado: number };
  ultimos: Array<{ created_at: string; canal: string | null }>;
}

const CANAL_LABEL: Record<string, string> = {
  web_share: "📲 App nativo",
  clipboard: "📋 Copiou link",
  cancelado: "✖️ Cancelou",
};

export default function ShareLoopCard() {
  const [m, setM] = useState<ShareMetrics | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/admin/shares")
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Erro ao carregar");
        setM(data);
      })
      .catch(e => setErro(e instanceof Error ? e.message : "Erro"));
  }, []);

  if (erro) return <p className="rounded-xl border border-[#d32f2f]/30 bg-[#d32f2f]/5 p-3 text-xs text-[#d32f2f]">Loop viral indisponível: {erro}</p>;
  if (!m) return <div className="h-[120px] animate-pulse rounded-2xl bg-[#1a3a1a]/[0.06]" />;

  const taxa = m.taxaShare;
  // Leitura do sinal: <15% fraco, 15-40% promissor, >40% forte
  const sinal = taxa === null ? { txt: "Sem dados ainda", cor: "#5c7568" }
    : taxa >= 40 ? { txt: "Sinal forte — vale construir convites", cor: "#00C853" }
    : taxa >= 15 ? { txt: "Sinal promissor — observe mais", cor: "#a16207" }
    : { txt: "Sinal fraco — foque em reter antes", cor: "#ff7043" };

  return (
    <div className="rounded-2xl border border-[#1a3a1a]/10 bg-white p-5">
      <div className="flex flex-wrap items-end gap-6">
        {/* Taxa de share — métrica-herói */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#5c7568]">Taxa de compartilhamento</p>
          <p className="mt-1 text-4xl font-black text-[#16241a]">
            {taxa === null ? "—" : `${taxa.toFixed(0)}%`}
          </p>
          <p className="mt-0.5 text-[11px] font-bold" style={{ color: sinal.cor }}>{sinal.txt}</p>
        </div>

        <div className="h-12 w-px bg-[#1a3a1a]/[0.06]" />

        {/* Conquistas vs shares */}
        <div className="flex gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#5c7568]">Conquistas</p>
            <p className="mt-1 text-2xl font-black text-[#16241a]">{m.conquistas}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#5c7568]">Shares</p>
            <p className="mt-1 text-2xl font-black text-[#00C853]">{m.shares}</p>
          </div>
        </div>
      </div>

      {/* Quebra por canal */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(["web_share", "clipboard", "cancelado"] as const).map(c => (
          <div key={c} className="rounded-xl border border-[#1a3a1a]/10 bg-[#1a3a1a]/[0.06] px-3 py-1.5">
            <span className="text-[11px] text-[#5c7568]">{CANAL_LABEL[c]}: </span>
            <span className="text-[13px] font-bold text-[#16241a]">{m.porCanal[c]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
