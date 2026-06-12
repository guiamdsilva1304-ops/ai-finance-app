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

  if (erro) return <p className="rounded-xl border border-[#ff5252]/30 bg-[#ff5252]/5 p-3 text-xs text-[#ff5252]">Loop viral indisponível: {erro}</p>;
  if (!m) return <div className="h-[120px] animate-pulse rounded-2xl bg-[#0e1a10]" />;

  const taxa = m.taxaShare;
  // Leitura do sinal: <15% fraco, 15-40% promissor, >40% forte
  const sinal = taxa === null ? { txt: "Sem dados ainda", cor: "#6b8f72" }
    : taxa >= 40 ? { txt: "Sinal forte — vale construir convites", cor: "#00C853" }
    : taxa >= 15 ? { txt: "Sinal promissor — observe mais", cor: "#F9A825" }
    : { txt: "Sinal fraco — foque em reter antes", cor: "#ff7043" };

  return (
    <div className="rounded-2xl border border-[#00C853]/10 bg-[#0e1a10] p-5">
      <div className="flex flex-wrap items-end gap-6">
        {/* Taxa de share — métrica-herói */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#3a6b45]">Taxa de compartilhamento</p>
          <p className="mt-1 text-4xl font-black text-white">
            {taxa === null ? "—" : `${taxa.toFixed(0)}%`}
          </p>
          <p className="mt-0.5 text-[11px] font-bold" style={{ color: sinal.cor }}>{sinal.txt}</p>
        </div>

        <div className="h-12 w-px bg-white/10" />

        {/* Conquistas vs shares */}
        <div className="flex gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3a6b45]">Conquistas</p>
            <p className="mt-1 text-2xl font-black text-white">{m.conquistas}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3a6b45]">Shares</p>
            <p className="mt-1 text-2xl font-black text-[#00C853]">{m.shares}</p>
          </div>
        </div>
      </div>

      {/* Quebra por canal */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(["web_share", "clipboard", "cancelado"] as const).map(c => (
          <div key={c} className="rounded-xl border border-[#00C853]/10 bg-white/[0.02] px-3 py-1.5">
            <span className="text-[11px] text-[#6b8f72]">{CANAL_LABEL[c]}: </span>
            <span className="text-[13px] font-bold text-[#dff0e3]">{m.porCanal[c]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
